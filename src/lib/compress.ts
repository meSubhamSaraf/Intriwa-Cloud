// Client-side media compression and validation.
// Images: Canvas resize + JPEG re-encode (runs in browser only).
// Videos: size-cap validation only (ffmpeg.wasm omitted for bundle size).

const MAX_IMAGE_PX = 1920;
const IMAGE_QUALITY = 0.78;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export function isImage(file: File) { return file.type.startsWith("image/"); }
export function isVideo(file: File) { return file.type.startsWith("video/"); }

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (Math.max(width, height) > MAX_IMAGE_PX) {
        if (width >= height) { height = Math.round((height * MAX_IMAGE_PX) / width); width = MAX_IMAGE_PX; }
        else { width = Math.round((width * MAX_IMAGE_PX) / height); height = MAX_IMAGE_PX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        IMAGE_QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export function validateVideo(file: File): { ok: boolean; error?: string } {
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "Video must be under 100 MB" };
  return { ok: true };
}

export async function prepareForUpload(file: File): Promise<{ file: File; ok: boolean; error?: string }> {
  if (isVideo(file)) {
    const v = validateVideo(file);
    return { file, ok: v.ok, error: v.error };
  }
  if (isImage(file)) {
    const compressed = await compressImage(file);
    return { file: compressed, ok: true };
  }
  return { file, ok: false, error: "Unsupported file type" };
}
