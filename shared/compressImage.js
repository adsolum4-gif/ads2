const ONE_MB = 1024 * 1024;
const MAX_EDGE = 1920;

function isImageBlob(file) {
  return typeof Blob !== "undefined" && file instanceof Blob && String(file.type || "").startsWith("image/");
}

async function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* canvas fallback below */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image. Try a JPG or PNG."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function asJpegFile(blob, originalName) {
  const base = String(originalName || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Shrink an image file to at most `maxBytes` (default 1MB) by lowering
 * JPEG quality, then dimensions if needed. GIFs and non-images are left as-is.
 */
export async function compressImage(file, maxBytes = ONE_MB) {
  if (!isImageBlob(file)) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= maxBytes) return file;

  const source = await loadImage(file);
  let width = source.width || source.naturalWidth;
  let height = source.height || source.naturalHeight;
  if (!width || !height) return file;

  if (Math.max(width, height) > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  let quality = 0.86;
  let blob = null;

  for (let i = 0; i < 12; i += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= maxBytes) break;
    if (quality > 0.5) quality = Math.max(0.5, quality - 0.12);
    else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }

  if (source.close) source.close();
  if (!blob) return file;
  return asJpegFile(blob, file.name);
}

export function isUploadFile(value) {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
