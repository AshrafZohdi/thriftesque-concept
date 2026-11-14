// Lifts the subject out of a photo with macOS Vision (the engine behind "lift subject"), writing a PNG with transparency.
// macOS 14 or later, nothing to install: swift scripts/vision-cutout.swift <input image> <output.png>
// Used by scripts/make-cutouts.ts (D-054). Exit code 2 means Vision found no subject.
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 3, let image = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
  FileHandle.standardError.write("usage: vision-cutout.swift <input> <output.png>\n".data(using: .utf8)!)
  exit(1)
}
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: image)
do {
  try handler.perform([request])
  guard let result = request.results?.first, !result.allInstances.isEmpty else { exit(2) }
  // All instances together: a piece photographed with its hanger or belt stays whole.
  let masked = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
  let ci = CIImage(cvPixelBuffer: masked)
  let ctx = CIContext()
  guard let cg = ctx.createCGImage(ci, from: ci.extent) else { exit(1) }
  let rep = NSBitmapImageRep(cgImage: cg)
  guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
  try png.write(to: URL(fileURLWithPath: args[2]))
} catch {
  FileHandle.standardError.write("vision: \(error)\n".data(using: .utf8)!)
  exit(1)
}
