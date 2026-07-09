/**
 * MediaPipe-Pose-Wrapper: Initialisierung, Frame-Verarbeitung und
 * Skelett-Overlay auf dem Canvas.
 */

import { LM } from "./analysis.js";

// MediaPipe liegt lokal unter vendor/ – die App läuft damit vollständig
// offline und ohne CDN-Abhängigkeit.
const LOCAL = {
  bundle: "../vendor/mediapipe/vision_bundle.mjs",
  wasmRoot: "vendor/mediapipe/wasm",
  model: "vendor/mediapipe/pose_landmarker_full.task",
};
const CDN = {
  bundle: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14",
  wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  model:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};

let landmarker = null;

async function createLandmarker(src) {
  const { PoseLandmarker, FilesetResolver } = await import(src.bundle);
  const vision = await FilesetResolver.forVisionTasks(src.wasmRoot);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: src.model, delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

export async function initPose() {
  if (landmarker) return landmarker;
  try {
    landmarker = await createLandmarker(LOCAL);
  } catch {
    // Fallback aufs CDN, falls die vendor/-Dateien fehlen
    landmarker = await createLandmarker(CDN);
  }
  return landmarker;
}

export function detectVideoFrame(video, timestampMs) {
  const result = landmarker.detectForVideo(video, timestampMs);
  return result.landmarks?.[0] ?? null;
}

/** Verbindungen für das Skelett-Overlay (eine Körperseite). */
function connections(side) {
  const i = LM[side];
  return [
    [i.shoulder, i.elbow],
    [i.elbow, i.wrist],
    [i.shoulder, i.hip],
    [i.hip, i.knee],
    [i.knee, i.ankle],
    [i.ankle, i.heel],
    [i.heel, i.footIndex],
    [i.ankle, i.footIndex],
  ];
}

export function drawSkeleton(ctx, landmarks, side, width, height) {
  ctx.lineWidth = Math.max(2, width / 300);
  ctx.strokeStyle = "rgba(56, 189, 148, 0.9)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  for (const [a, b] of connections(side)) {
    const pa = landmarks[a], pb = landmarks[b];
    if (!pa || !pb || pa.visibility < 0.4 || pb.visibility < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }
  const idx = LM[side];
  for (const name of ["shoulder", "elbow", "wrist", "hip", "knee", "ankle", "footIndex"]) {
    const pt = landmarks[idx[name]];
    if (!pt || pt.visibility < 0.4) continue;
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, Math.max(3, width / 250), 0, Math.PI * 2);
    ctx.fill();
  }
}
