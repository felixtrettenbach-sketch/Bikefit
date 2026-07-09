/**
 * Empfehlungslogik: leitet aus der gemessenen Ausgangslage und den
 * Körper-/Radmaßen konkrete Einstellungsänderungen ab.
 */

import { TARGETS, SEGMENT_FRACTIONS, SADDLE_FORMULAS } from "./science.js";
import { rate } from "./analysis.js";

/**
 * Abstand Hüfte→Sprunggelenk bei gegebener Kniebeugung (Kosinussatz).
 * @param {number} flexDeg Kniebeugung in Grad (0 = gestreckt)
 * @param {number} thigh Oberschenkellänge in mm
 * @param {number} shank Unterschenkellänge in mm
 */
function hipAnkleDistance(flexDeg, thigh, shank) {
  const included = ((180 - flexDeg) * Math.PI) / 180;
  return Math.sqrt(
    thigh * thigh + shank * shank - 2 * thigh * shank * Math.cos(included)
  );
}

/**
 * Erforderliche Sattelhöhen-Änderung (mm), damit die Kniebeugung am unteren
 * Totpunkt vom Messwert auf den Zielwert wandert. Geometrische Näherung über
 * die Beinsegmentlängen (Winter 2009); positive Werte = Sattel höher.
 */
export function saddleHeightDelta(measuredFlex, targetFlex, heightMm) {
  const thigh = SEGMENT_FRACTIONS.thigh * heightMm;
  const shank = SEGMENT_FRACTIONS.shank * heightMm;
  return (
    hipAnkleDistance(targetFlex, thigh, shank) -
    hipAnkleDistance(measuredFlex, thigh, shank)
  );
}

const fmtMm = (v) => `${v > 0 ? "+" : "−"}${Math.abs(Math.round(v))} mm`;
const fmtDeg = (v) => `${Math.round(v)}°`;

/**
 * Erstellt die vollständige Bewertung + Empfehlungen.
 * @param {object} summary Ergebnis von summarize()
 * @param {object} rider   {heightCm, inseamCm, goal, crankMm, saddleHeightMm?, setbackMm?, dropMm?}
 * @returns {{findings: Array, recommendations: Array, formulas: Array}}
 */
export function buildReport(summary, rider) {
  const findings = [];
  const recommendations = [];
  const heightMm = rider.heightCm * 10;
  const inseamMm = rider.inseamCm * 10;

  // ---------- 1) Sattelhöhe über Kniebeugung am unteren Totpunkt ----------
  const kneeT = TARGETS.kneeFlexBDC;
  const kneeRating = rate(summary.kneeFlexBDC, kneeT.min, kneeT.max);
  findings.push({
    key: "kneeFlexBDC",
    label: kneeT.label,
    value: fmtDeg(summary.kneeFlexBDC),
    target: `${kneeT.min}–${kneeT.max}° (dynamisch)`,
    rating: kneeRating,
    refs: kneeT.refs,
    note: kneeT.note,
  });

  if (kneeRating.status !== "na" && summary.isPedalling) {
    const delta = saddleHeightDelta(summary.kneeFlexBDC, kneeT.optimal, heightMm);
    if (kneeRating.status === "ok" && Math.abs(delta) < 5) {
      recommendations.push({
        area: "Sattelhöhe",
        priority: "ok",
        text:
          `Die Kniebeugung am unteren Totpunkt liegt mit ${fmtDeg(summary.kneeFlexBDC)} ` +
          `im dynamischen Zielbereich von ${kneeT.min}–${kneeT.max}°. Keine Änderung nötig.`,
        refs: kneeT.refs,
      });
    } else {
      const direction = delta > 0 ? "höher" : "niedriger";
      const stepAdvice =
        Math.abs(delta) > 5
          ? " In Schritten von maximal 5 mm ändern und jeweils neu messen – große Sprünge verändern das Tretmuster und erhöhen das Verletzungsrisiko (Bini 2011)."
          : "";
      recommendations.push({
        area: "Sattelhöhe",
        priority: kneeRating.status === "ok" ? "minor" : "major",
        text:
          `Sattel ca. ${fmtMm(delta)} ${direction} stellen, um die Kniebeugung am ` +
          `unteren Totpunkt von ${fmtDeg(summary.kneeFlexBDC)} auf ~${kneeT.optimal}° zu bringen ` +
          `(geometrische Näherung über Beinsegmentlängen nach Winter 2009).${stepAdvice}`,
        refs: [...kneeT.refs, "winter2009"],
      });
    }
  }

  // ---------- 2) Kniebeugung am oberen Totpunkt (Kurbellänge/Sattel) ----------
  if (summary.isPedalling) {
    const tdcT = TARGETS.kneeFlexTDC;
    const tdcRating = rate(summary.kneeFlexTDC, tdcT.min, tdcT.max);
    findings.push({
      key: "kneeFlexTDC",
      label: tdcT.label,
      value: fmtDeg(summary.kneeFlexTDC),
      target: `${tdcT.min}–${tdcT.max}°`,
      rating: tdcRating,
      refs: tdcT.refs,
      note: tdcT.note,
    });
    if (tdcRating.status === "high") {
      recommendations.push({
        area: "Kurbel / Sattelhöhe",
        priority: "minor",
        text:
          `Die maximale Kniebeugung am oberen Totpunkt ist mit ${fmtDeg(summary.kneeFlexTDC)} ` +
          `hoch. Wenn die Sattelhöhe bereits korrekt ist, kann eine kürzere Kurbel ` +
          `(${rider.crankMm ? `aktuell ${rider.crankMm} mm` : "z.B. −2,5 bis −5 mm"}) die ` +
          `patellofemorale Belastung und die Hüftbeugung am oberen Totpunkt reduzieren.`,
        refs: tdcT.refs,
      });
    }
  }

  // ---------- 3) Hüftwinkel ----------
  const hipT = TARGETS.hipAngleMin;
  const hipRating = rate(summary.hipAngleMin, hipT.min, hipT.max);
  findings.push({
    key: "hipAngleMin",
    label: hipT.label,
    value: fmtDeg(summary.hipAngleMin),
    target: `> ${hipT.min}°`,
    rating: hipRating.status === "high" ? { status: "ok", text: "unkritisch" } : hipRating,
    refs: hipT.refs,
    note: hipT.note,
  });
  if (hipRating.status === "low") {
    recommendations.push({
      area: "Cockpit / Sitzlänge",
      priority: "major",
      text:
        `Der minimale Hüftwinkel ist mit ${fmtDeg(summary.hipAngleMin)} sehr geschlossen. ` +
        `Lenker höher (Spacer) und/oder Sattel geringfügig zurück bzw. kürzere Kurbel ` +
        `öffnen die Hüfte am oberen Totpunkt und verbessern Atmung und Kraftentfaltung.`,
      refs: hipT.refs,
    });
  }

  // ---------- 4) Rumpfwinkel (zielabhängig) ----------
  const torsoT = TARGETS.torsoAngle;
  const goalRange = torsoT.byGoal[rider.goal] ?? torsoT.byGoal.endurance;
  const torsoRating = rate(summary.torsoAngle, goalRange.min, goalRange.max);
  findings.push({
    key: "torsoAngle",
    label: `${torsoT.label} (Ziel: ${goalRange.label})`,
    value: fmtDeg(summary.torsoAngle),
    target: `${goalRange.min}–${goalRange.max}°`,
    rating: torsoRating,
    refs: torsoT.refs,
    note: torsoT.note,
  });
  if (torsoRating.status === "low") {
    recommendations.push({
      area: "Cockpit (Höhe/Länge)",
      priority: "major",
      text:
        `Der Rumpf ist mit ${fmtDeg(summary.torsoAngle)} flacher als der Zielbereich ` +
        `${goalRange.min}–${goalRange.max}° für „${goalRange.label}“. Lenker über Spacer ` +
        `(+5 bis +10 mm) erhöhen oder kürzeren/positiver geneigten Vorbau montieren. ` +
        `Eine flache Position lohnt sich aerodynamisch nur, wenn sie ohne Leistungs- ` +
        `und Komfortverlust gehalten werden kann (Fintelman 2014).`,
      refs: torsoT.refs,
    });
  } else if (torsoRating.status === "high") {
    recommendations.push({
      area: "Cockpit (Höhe/Länge)",
      priority: "minor",
      text:
        `Der Rumpf ist mit ${fmtDeg(summary.torsoAngle)} aufrechter als der Zielbereich ` +
        `${goalRange.min}–${goalRange.max}° für „${goalRange.label}“. Falls mehr ` +
        `Aerodynamik gewünscht ist und die Beweglichkeit es zulässt: Spacer schrittweise ` +
        `(−5 mm) entfernen oder längeren Vorbau testen.`,
      refs: torsoT.refs,
    });
  }

  // ---------- 5) Ellbogenwinkel ----------
  if (Number.isFinite(summary.elbowAngle)) {
    const elbowT = TARGETS.elbowAngle;
    const elbowRating = rate(summary.elbowAngle, elbowT.min, elbowT.max);
    findings.push({
      key: "elbowAngle",
      label: elbowT.label,
      value: fmtDeg(summary.elbowAngle),
      target: `${elbowT.min}–${elbowT.max}°`,
      rating: elbowRating,
      refs: elbowT.refs,
      note: elbowT.note,
    });
    if (elbowRating.status === "high") {
      recommendations.push({
        area: "Cockpit (Reichweite)",
        priority: "minor",
        text:
          `Die Arme sind mit ${fmtDeg(summary.elbowAngle)} nahezu durchgestreckt – ein ` +
          `Hinweis auf ein zu langes oder zu tiefes Cockpit. Kürzerer Vorbau (−10 mm) ` +
          `oder höhere Lenkerposition entlastet Hände, Schultern und Nacken.`,
        refs: elbowT.refs,
      });
    } else if (elbowRating.status === "low") {
      recommendations.push({
        area: "Cockpit (Reichweite)",
        priority: "minor",
        text:
          `Die Ellbogen sind mit ${fmtDeg(summary.elbowAngle)} stark gebeugt – die ` +
          `Position wirkt gestaucht. Längerer Vorbau (+10 mm) oder Sattel minimal ` +
          `zurück kann die Druckverteilung verbessern.`,
        refs: elbowT.refs,
      });
    }
  }

  // ---------- 6) Sattel-Längsposition (qualitativ) ----------
  recommendations.push({
    area: "Sattel-Längsposition",
    priority: "info",
    text:
      `Die klassische KOPS-Regel (Knielot über Pedalachse) ist eine Heuristik ohne ` +
      `belastbare biomechanische Begründung (de Vey Mestdagh 1998). Praktikabler: ` +
      `Setback so wählen, dass der Hüftwinkel offen genug bleibt und das Becken auf ` +
      `dem Sattel stabil steht. Nach jeder Setback-Änderung die Sattelhöhe erneut ` +
      `prüfen (±Setback verändert effektiv die Beinstreckung).`,
    refs: ["deveymestdagh1998", "bini2011"],
  });

  // ---------- 7) Anthropometrische Formel-Vergleiche ----------
  const formulas = [];
  if (inseamMm > 0) {
    const lemond = SADDLE_FORMULAS.lemond.factor * inseamMm;
    formulas.push({
      label: SADDLE_FORMULAS.lemond.label,
      value: `${Math.round(lemond)} mm`,
      diff:
        rider.saddleHeightMm > 0
          ? `Abweichung zur aktuellen Einstellung: ${fmtMm(rider.saddleHeightMm - lemond)}`
          : null,
      refs: [SADDLE_FORMULAS.lemond.ref],
    });
    const hamleyPedal = SADDLE_FORMULAS.hamley.factor * inseamMm;
    const hamleyBB = rider.crankMm > 0 ? hamleyPedal - rider.crankMm : null;
    formulas.push({
      label: SADDLE_FORMULAS.hamley.label,
      value:
        `${Math.round(hamleyPedal)} mm` +
        (hamleyBB ? ` (entspricht ${Math.round(hamleyBB)} mm Tretlager→Satteloberkante bei ${rider.crankMm} mm Kurbel)` : ""),
      diff:
        hamleyBB && rider.saddleHeightMm > 0
          ? `Abweichung zur aktuellen Einstellung: ${fmtMm(rider.saddleHeightMm - hamleyBB)}`
          : null,
      refs: [SADDLE_FORMULAS.hamley.ref],
    });
  }

  return { findings, recommendations, formulas };
}
