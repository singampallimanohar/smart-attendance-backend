const faceapi = require("face-api.js");
const fs = require("fs");
const path = require("path");
const { Canvas, Image, ImageData } = require("canvas");

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.join(__dirname, "../models");

let loaded = false;

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

async function loadFaceModels() {
  if (loaded) return true;

  console.log("📦 Loading Face Models from:", MODEL_PATH);

  // IMPORTANT: folder-based paths (NOT file-based)
  const requiredFolders = [
    "ssd_mobilenetv1_model",
    "face_landmark_68_model",
    "face_recognition_model",
  ];

  for (const folder of requiredFolders) {
    const fullPath = path.join(MODEL_PATH, folder);

    if (!fileExists(fullPath)) {
      console.log("❌ Missing folder:", folder);
      return false;
    }
  }

  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

    loaded = true;
    console.log("✅ Face models loaded successfully");
    return true;
  } catch (err) {
    console.log("❌ Face Model Load Error:", err);
    return false;
  }
}

module.exports = {
  loadFaceModels,
  isFaceApiLoaded: () => loaded,
};