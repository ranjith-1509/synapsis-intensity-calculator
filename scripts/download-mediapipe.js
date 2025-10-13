const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const WASM_FILES = [
  'vision_wasm_internal.wasm',
  'vision_wasm_internal.js'
];
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const download = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200)
          return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });

async function downloadFiles() {
  const wasmDir = path.join(__dirname, '../public/wasm');
  const modelDir = path.join(__dirname, '../public/models');

  if (!fs.existsSync(wasmDir)) fs.mkdirSync(wasmDir, { recursive: true });
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });

  // Download both wasm + js
  for (const file of WASM_FILES) {
    await download(`${BASE_URL}/${file}`, path.join(wasmDir, file));
  }

  // Download model
  await download(MODEL_URL, path.join(modelDir, 'gesture_recognizer.task'));
}

downloadFiles().catch(console.error);
