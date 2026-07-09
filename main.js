/**
 * App-Logik: UI-Steuerung, Aufnahme-Verarbeitung (Video/Webcam),
 * Auswertung und Darstellung des Berichts.
 */

import { initPose, detectVideoFrame, drawSkeleton } from "./pose.js";
import { frameAngles, pickSide, summarize } from "./analysis.js";
import { buildReport } from "./recommendations.js";
import { TARGETS, REFERENCES, refById } from "./science.js";

const $ = (id) => document.getElementById(id);

const state = {
  recordings: [], // { name, samples: [...] }
  processing: false,
  webcamStream: null,
};

// ---------------------------------------------------------------- Aufnahme

const video = $("video");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");

function setStatus(text) {
  $("captureStatus").textContent = text;
}

function liveAngles(a) {
  $("liveAngles").innerHTML = a
    ? `Knie ${a.kneeFlex.toFixed(0)}° · Hüfte ${a.hipAngle.toFixed(0)}° · ` +
      `Rumpf ${a.torsoAngle.toFixed(0)}° · Ellbogen ${Number.isFinite(a.elbowAngle) ? a.elbowAngle.toFixed(0) + "°" : "–"}`
    : "Keine Pose erkannt";
}

function fitCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

/** Verarbeitet einen einzelnen Frame und sammelt die Winkel ein. */
function processFrame(samples) {
  const landmarks = detectVideoFrame(video, performance.now());
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (!landmarks) {
    liveAngles(null);
    return;
  }
  const side = pickSide(landmarks);
  drawSkeleton(ctx, landmarks, side, canvas.width, canvas.height);
  const angles = frameAngles(landmarks, side);
  liveAngles(angles);
  if (angles) samples.push(angles);
}

const CDN_ERROR =
  "Pose-Modell konnte nicht geladen werden – Internetverbindung erforderlich (MediaPipe-CDN).";

async function analyzeVideoFile(file) {
  try {
    await initPose();
  } catch {
    setStatus(CDN_ERROR);
    return;
  }
  state.processing = true;
  setStatus(`Analysiere „${file.name}“ …`);
  const samples = [];
  video.srcObject = null;
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.playbackRate = 1;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      fitCanvas();
      video.play().catch(reject);
    };
    video.onerror = () => reject(new Error("Video konnte nicht geladen werden."));

    const useRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
    const loop = () => {
      if (video.ended) return resolve();
      processFrame(samples);
      setStatus(
        `Analysiere „${file.name}“ … ${Math.round((video.currentTime / video.duration) * 100)} % ` +
          `(${samples.length} Messpunkte)`
      );
      if (useRVFC) video.requestVideoFrameCallback(loop);
      else requestAnimationFrame(loop);
    };
    video.onplaying = () => {
      if (useRVFC) video.requestVideoFrameCallback(loop);
      else requestAnimationFrame(loop);
    };
    video.onended = () => resolve();
  }).catch((err) => setStatus(`Fehler: ${err.message}`));

  URL.revokeObjectURL(video.src);
  state.processing = false;
  finishRecording(file.name, samples);
}

async function startWebcam() {
  try {
    await initPose();
  } catch {
    setStatus(CDN_ERROR);
    return;
  }
  try {
    state.webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
    });
  } catch {
    setStatus("Kamera-Zugriff verweigert oder keine Kamera gefunden.");
    return;
  }
  video.src = "";
  video.srcObject = state.webcamStream;
  video.muted = true;
  await video.play();
  fitCanvas();

  const samples = [];
  state.processing = true;
  $("btnWebcam").hidden = true;
  $("btnWebcamStop").hidden = false;
  setStatus("Webcam läuft – seitlich pedalieren, mindestens 15–20 s aufnehmen …");

  const loop = () => {
    if (!state.processing) {
      state.webcamStream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      finishRecording(`Webcam ${new Date().toLocaleTimeString()}`, samples);
      return;
    }
    processFrame(samples);
    setStatus(`Webcam läuft … ${samples.length} Messpunkte`);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function finishRecording(name, samples) {
  if (samples.length < 10) {
    setStatus(
      `„${name}“: zu wenige verwertbare Messpunkte (${samples.length}). ` +
        `Bitte auf gute Ausleuchtung, vollständige Seitenansicht und freie Sicht auf ` +
        `Hüfte/Knie/Sprunggelenk achten.`
    );
    return;
  }
  state.recordings.push({ name, samples });
  setStatus(`„${name}“ erfasst: ${samples.length} Messpunkte.`);
  renderRecordingList();
  $("btnAnalyze").disabled = false;
}

function renderRecordingList() {
  $("recordingList").innerHTML = state.recordings
    .map(
      (r, i) =>
        `<li>${r.name} – ${r.samples.length} Messpunkte ` +
        `<button class="link" data-remove="${i}">entfernen</button></li>`
    )
    .join("");
  $("recordingList").querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.recordings.splice(Number(btn.dataset.remove), 1);
      renderRecordingList();
      $("btnAnalyze").disabled = state.recordings.length === 0;
    })
  );
}

// ---------------------------------------------------------------- Bericht

function readRider() {
  return {
    heightCm: Number($("inHeight").value),
    inseamCm: Number($("inInseam").value),
    goal: $("inGoal").value,
    crankMm: Number($("inCrank").value) || 0,
    saddleHeightMm: Number($("inSaddle").value) || 0,
    setbackMm: Number($("inSetback").value) || 0,
    dropMm: Number($("inDrop").value) || 0,
  };
}

function refSup(refs) {
  return refs
    .map((id) => {
      const n = REFERENCES.indexOf(refById(id)) + 1;
      return `<a href="#ref-${id}" title="${refById(id).full}">[${n}]</a>`;
    })
    .join("");
}

const RATING_LABEL = {
  ok: ["✓", "ok"],
  low: ["▼", "low"],
  high: ["▲", "high"],
  na: ["–", "na"],
};

function renderReport() {
  const rider = readRider();
  if (!(rider.heightCm > 100) || !(rider.inseamCm > 40)) {
    alert("Bitte zuerst Körpergröße und Schrittlänge unter „1. Maße“ eintragen.");
    return;
  }
  const allSamples = state.recordings.flatMap((r) => r.samples);
  const summary = summarize(allSamples);
  if (!summary) {
    alert("Zu wenige verwertbare Messpunkte für eine Auswertung.");
    return;
  }

  $("results").hidden = false;

  // Hinweis, falls kein Pedalieren erkennbar
  $("pedallingWarning").hidden = summary.isPedalling;

  // Ausgangslage
  const { findings, recommendations, formulas } = buildReport(summary, rider);
  $("findingsBody").innerHTML = findings
    .map((f) => {
      const [icon, cls] = RATING_LABEL[f.rating.status] ?? RATING_LABEL.na;
      return `<tr>
        <td>${f.label} ${refSup(f.refs)}</td>
        <td class="num">${f.value}</td>
        <td class="num">${f.target}</td>
        <td class="rating ${cls}">${icon} ${f.rating.text}</td>
      </tr>
      <tr class="note"><td colspan="4">${f.note}</td></tr>`;
    })
    .join("");

  $("summaryMeta").textContent =
    `${state.recordings.length} Aufnahme(n), ${summary.n} Messpunkte · ` +
    `Bewegungsumfang Knie: ${summary.kneeROM.toFixed(0)}°` +
    (summary.isPedalling ? "" : " (kein Pedalieren erkannt!)");

  // Empfehlungen
  const prioOrder = { major: 0, minor: 1, info: 2, ok: 3 };
  const prioLabel = {
    major: "Wichtig",
    minor: "Feinschliff",
    info: "Hinweis",
    ok: "Passt",
  };
  $("recList").innerHTML = recommendations
    .sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority])
    .map(
      (r) => `<li class="rec ${r.priority}">
        <span class="badge">${prioLabel[r.priority]}</span>
        <strong>${r.area}:</strong> ${r.text} ${refSup(r.refs)}
      </li>`
    )
    .join("");

  // Formel-Vergleiche
  $("formulaList").innerHTML = formulas.length
    ? formulas
        .map(
          (f) =>
            `<li><strong>${f.label}</strong> ${refSup(f.refs)}: ${f.value}` +
            (f.diff ? `<br><span class="muted">${f.diff}</span>` : "") +
            `</li>`
        )
        .join("")
    : "<li class='muted'>Keine Schrittlänge angegeben.</li>";

  drawKneeChart(allSamples);
  renderReferences();
  $("results").scrollIntoView({ behavior: "smooth" });
}

function drawKneeChart(samples) {
  const c = $("kneeChart");
  const g = c.getContext("2d");
  const W = (c.width = c.clientWidth * devicePixelRatio);
  const H = (c.height = 220 * devicePixelRatio);
  g.clearRect(0, 0, W, H);
  const values = samples.map((s) => s.kneeFlex);
  const yMin = 0, yMax = 140;
  const y = (v) => H - ((v - yMin) / (yMax - yMin)) * H;
  const x = (i) => (i / Math.max(1, values.length - 1)) * W;

  // Zielband unterer Totpunkt
  const t = TARGETS.kneeFlexBDC;
  g.fillStyle = "rgba(56, 189, 148, 0.15)";
  g.fillRect(0, y(t.max), W, y(t.min) - y(t.max));

  // Gitterlinien
  g.strokeStyle = "rgba(128,128,128,0.25)";
  g.fillStyle = "rgba(128,128,128,0.9)";
  g.font = `${11 * devicePixelRatio}px system-ui`;
  g.lineWidth = 1;
  for (let v = 0; v <= yMax; v += 20) {
    g.beginPath();
    g.moveTo(0, y(v));
    g.lineTo(W, y(v));
    g.stroke();
    g.fillText(`${v}°`, 4 * devicePixelRatio, y(v) - 3 * devicePixelRatio);
  }

  // Messkurve
  g.strokeStyle = "#2f81f7";
  g.lineWidth = 1.5 * devicePixelRatio;
  g.beginPath();
  values.forEach((v, i) => (i === 0 ? g.moveTo(x(i), y(v)) : g.lineTo(x(i), y(v))));
  g.stroke();
}

function renderReferences() {
  $("refList").innerHTML = REFERENCES.map(
    (r, i) => `<li id="ref-${r.id}">[${i + 1}] ${r.full}</li>`
  ).join("");
}

// ---------------------------------------------------------------- Wiring

$("fileInput").addEventListener("change", async (e) => {
  for (const file of e.target.files) {
    await analyzeVideoFile(file);
  }
  e.target.value = "";
});

$("btnWebcam").addEventListener("click", startWebcam);
$("btnWebcamStop").addEventListener("click", () => {
  state.processing = false;
  $("btnWebcam").hidden = false;
  $("btnWebcamStop").hidden = true;
});

$("btnAnalyze").addEventListener("click", renderReport);

// Pose-Modell im Hintergrund vorladen
initPose()
  .then(() => setStatus("Bereit. Video hochladen oder Webcam starten."))
  .catch(() => setStatus(CDN_ERROR));

// Testzugang für automatisierte UI-Tests (nur mit ?debug in der URL aktiv)
if (new URLSearchParams(location.search).has("debug")) {
  window.__bikefit = { state, finishRecording, renderReport };
}
