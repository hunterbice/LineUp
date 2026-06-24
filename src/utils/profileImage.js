export const PROFILE_IMAGE_MAX_DIMENSION = 768;
export const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 220000;

// Native rebuild note: Swift should use PhotosPicker and perform equivalent
// resizing/compression before uploading the selected image.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo format is not supported here. Choose a JPEG, PNG, or WebP image.")); };
    image.src = url;
  });
}

function canvasDataUrl(image, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Photo processing is unavailable on this device.");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function compressedCanvasDataUrl(canvas) {
  const qualities = [0.84, 0.74, 0.64, 0.54];
  for (const quality of qualities) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= PROFILE_IMAGE_MAX_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error("LineUp could not make this photo small enough. Try a different JPEG, PNG, or WebP image.");
}

export async function prepareProfileImage(file) {
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Choose a JPEG, PNG, or WebP image.");
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error("LineUp could not read this photo.");
  const maxSourceDimension = 1400;
  const scale = Math.min(1, maxSourceDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  return { dataUrl: canvasDataUrl(image, width, height, 0.88), width, height };
}

export function compressProfileCrop(canvas) {
  if (!canvas || canvas.width !== 512 || canvas.height !== 512) throw new Error("Photo crop is unavailable. Try again.");
  return compressedCanvasDataUrl(canvas);
}

export async function resizeProfileImage(file) {
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Choose a JPEG, PNG, or WebP image.");
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error("LineUp could not read this photo.");

  const initialScale = Math.min(1, PROFILE_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * initialScale));
  let height = Math.max(1, Math.round(sourceHeight * initialScale));
  const qualities = [0.82, 0.72, 0.62, 0.52];

  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    for (const quality of qualities) {
      const dataUrl = canvasDataUrl(image, width, height, quality);
      if (dataUrl.length <= PROFILE_IMAGE_MAX_DATA_URL_LENGTH) return dataUrl;
    }
    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
  }
  throw new Error("LineUp could not make this photo small enough. Try a different JPEG, PNG, or WebP image.");
}
