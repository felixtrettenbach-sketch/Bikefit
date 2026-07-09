/**
 * Kinematische Analyse der Pose-Zeitreihen.
 *
 * Grundlage ist eine 2D-Seitenansicht des Fahrers auf der Rolle. Aus den
 * MediaPipe-Landmarks werden pro Frame Gelenkwinkel berechnet; über die
 * gesamte Aufnahme werden robuste Perzentile gebildet, um die Winkel am
 * oberen/unteren Totpunkt zu bestimmen (ohne explizite Kurbelumdrehungs-
 * Erkennung, dadurch robust gegen Aussetzer der Pose-Erkennung).
 */

// MediaPipe-Pose-Landmark-Indizes
export const LM = {
  LEFT: {
    shoulder: 11, elbow: 13, wrist: 15,
    hip: 23, knee: 25, ankle: 27, heel: 29, footIndex: 31,
  },
  RIGHT: {
    shoulder: 12, elbow: 14, wrist: 16,
    hip: 24, knee: 26, ankle: 28, heel: 30, footIndex: 32,
  },
};

/** Winkel (Grad) am Punkt b zwischen den Strecken b→a und b→c. */
export function angleABC(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const n1 = Math.hypot(v1.x, v1.y);
  const n2 = Math.hypot(v2.x, v2.y);
  if (n1 === 0 || n2 === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Wählt die dem Betrachter zugewandte Körperseite anhand der Sichtbarkeit. */
export function pickSide(landmarks) {
  const score = (side) =>
    ["shoulder", "hip", "knee", "ankle"]
      .map((k) => landmarks[LM[side][k]]?.visibility ?? 0)
      .reduce((a, b) => a + b, 0);
  return score("LEFT") >= score("RIGHT") ? "LEFT" : "RIGHT";
}

/**
 * Berechnet die Gelenkwinkel eines Frames.
 * Bildkoordinaten: x nach rechts, y nach UNTEN.
 * @returns {object|null} Winkel in Grad oder null bei zu schlechter Sichtbarkeit.
 */
export function frameAngles(landmarks, side) {
  const idx = LM[side];
  const p = (name) => landmarks[idx[name]];
  const required = ["shoulder", "hip", "knee", "ankle"];
  const minVis = Math.min(...required.map((k) => p(k)?.visibility ?? 0));
  if (minVis < 0.5) return null;

  const shoulder = p("shoulder"), hip = p("hip"), knee = p("knee"),
    ankle = p("ankle"), elbow = p("elbow"), wrist = p("wrist"),
    footIndex = p("footIndex");

  // Kniebeugung: 0° = gestrecktes Bein
  const kneeFlex = 180 - angleABC(hip, knee, ankle);
  // Hüftwinkel: Schulter–Hüfte–Knie (eingeschlossener Winkel)
  const hipAngle = angleABC(shoulder, hip, knee);
  // Rumpfwinkel zur Horizontalen (y-Achse zeigt im Bild nach unten)
  const torsoAngle =
    (Math.atan2(hip.y - shoulder.y, Math.abs(shoulder.x - hip.x)) * 180) / Math.PI;

  const elbowOk = (elbow?.visibility ?? 0) > 0.5 && (wrist?.visibility ?? 0) > 0.5;
  const elbowAngle = elbowOk ? angleABC(shoulder, elbow, wrist) : NaN;

  const ankleOk = (footIndex?.visibility ?? 0) > 0.5;
  const ankleAngle = ankleOk ? angleABC(knee, ankle, footIndex) : NaN;

  return { kneeFlex, hipAngle, torsoAngle, elbowAngle, ankleAngle, ankleY: ankle.y };
}

export function percentile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stats(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return {
    n: v.length,
    mean,
    p05: percentile(v, 0.05),
    p50: percentile(v, 0.5),
    p95: percentile(v, 0.95),
  };
}

/**
 * Aggregiert alle Frame-Messungen einer oder mehrerer Aufnahmen.
 * @param {Array<object>} samples Frame-Winkel aus frameAngles()
 * @returns {object|null} Kennwerte der Ausgangslage
 */
export function summarize(samples) {
  if (samples.length < 10) return null;
  const knee = stats(samples.map((s) => s.kneeFlex));
  const hip = stats(samples.map((s) => s.hipAngle));
  const torso = stats(samples.map((s) => s.torsoAngle));
  const elbow = stats(samples.map((s) => s.elbowAngle));
  const ankle = stats(samples.map((s) => s.ankleAngle));
  if (!knee || !hip || !torso) return null;

  // Pedaliert der Fahrer überhaupt? Bewegungsumfang des Knies prüfen.
  const kneeROM = knee.p95 - knee.p05;

  return {
    n: samples.length,
    isPedalling: kneeROM > 30,
    kneeROM,
    // Unterer Totpunkt = minimale Kniebeugung (robust: 5. Perzentil)
    kneeFlexBDC: knee.p05,
    // Oberer Totpunkt = maximale Kniebeugung (95. Perzentil)
    kneeFlexTDC: knee.p95,
    // Geschlossene Hüfte am oberen Totpunkt
    hipAngleMin: hip.p05,
    torsoAngle: torso.p50,
    elbowAngle: elbow ? elbow.p50 : NaN,
    ankleStats: ankle,
  };
}

/** Bewertet einen Messwert gegen einen Zielbereich. */
export function rate(value, min, max) {
  if (!Number.isFinite(value)) return { status: "na", text: "nicht messbar" };
  if (value < min) return { status: "low", text: "unter Zielbereich" };
  if (value > max) return { status: "high", text: "über Zielbereich" };
  return { status: "ok", text: "im Zielbereich" };
}
