// Background removal model, off the main thread (D-036). The bundler serves the ONNX Runtime CPU file from our own site;
// the model file comes from Hugging Face once and is then cached by the browser.
import * as ort from "onnxruntime-web/wasm";
import { CUTOUT } from "./photo-spec";

let session: Promise<ort.InferenceSession> | null = null;

self.onmessage = async (e: MessageEvent<{ id: number; pixels: Float32Array }>) => {
  const { id, pixels } = e.data;
  try {
    session ??= ort.InferenceSession.create(CUTOUT.modelUrl, { executionProviders: ["wasm"] });
    const s = await session;
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", pixels, [1, 3, CUTOUT.size, CUTOUT.size]) });
    const y = out[s.outputNames[0]].data as Float32Array;
    // This model returns 0..1 already; guard against logits anyway.
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < y.length; i += 997) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
    const mask = lo < -0.01 || hi > 1.01 ? y.map((v) => 1 / (1 + Math.exp(-v))) : y;
    self.postMessage({ id, mask }, { transfer: [mask.buffer] });
  } catch (err) {
    session = null;
    self.postMessage({ id, error: err instanceof Error ? err.message : "Background removal failed." });
  }
};
