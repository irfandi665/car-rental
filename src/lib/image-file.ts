export const MAX_ID_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CAR_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export type DetectedImage = {
  ext: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImage(buf: Buffer): DetectedImage | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buf.length > 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}