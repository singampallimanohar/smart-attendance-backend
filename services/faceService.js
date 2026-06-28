const faceapi = require("@vladmandic/face-api");
const canvas = require("canvas");
const path = require("path");

const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.join(__dirname, "../models");

let initialized = false;

async function loadModels() {
  if (initialized) return;

  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

    initialized = true;
    console.log("✅ Face Models Loaded in Service");
  } catch (err) {
    console.error("❌ Face Service Load Error:", err.message);
  }
}

// ================= MATCH FACE =================
async function matchFace(inputDescriptor, storedDescriptors) {
  try {
    await loadModels();

    const labeledDescriptors = storedDescriptors.map((data) => {
      return new faceapi.LabeledFaceDescriptors(
        data.student_id,
        [new Float32Array(JSON.parse(data.face_descriptor))]
      );
    });

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

    const bestMatch = faceMatcher.findBestMatch(inputDescriptor);

    if (bestMatch.label === "unknown") {
      return null;
    }

    return bestMatch.label;
  } catch (err) {
    console.error("Face Match Error:", err.message);
    return null;
  }
}

module.exports = {
  loadModels,
  matchFace,
};