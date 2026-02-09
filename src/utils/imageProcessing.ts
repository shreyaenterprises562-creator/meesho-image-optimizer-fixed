
import { MEEHSHO_SIZE, PRODUCT_SCALE, BORDER_THICKNESS_PERCENT, MAX_FILE_SIZE_KB } from '../constants';

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const getProductBoundingBox = (canvas: HTMLCanvasElement): { x: number, y: number, w: number, h: number } | null => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      const r = data[(y * canvas.width + x) * 4];
      const g = data[(y * canvas.width + x) * 4 + 1];
      const b = data[(y * canvas.width + x) * 4 + 2];

      // Detect "non-white" pixels (Gemini returns product on white)
      // threshold: if any channel is not white or if alpha is not 0
      const isWhite = r > 245 && g > 245 && b > 245;
      if (!isWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  return found ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
};

export const createVariant = async (
  productImg: HTMLImageElement,
  bgColor: string,
  borderColor: string
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = MEEHSHO_SIZE;
  canvas.height = MEEHSHO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  // 1. Draw solid background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, MEEHSHO_SIZE, MEEHSHO_SIZE);

  // 2. Draw thick border
  const borderThickness = MEEHSHO_SIZE * BORDER_THICKNESS_PERCENT;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderThickness;
  ctx.strokeRect(borderThickness / 2, borderThickness / 2, MEEHSHO_SIZE - borderThickness, MEEHSHO_SIZE - borderThickness);

  // 3. Draw product centered
  // Calculate best fit within 68% of 1000px
  const innerArea = MEEHSHO_SIZE * PRODUCT_SCALE;
  const ratio = Math.min(innerArea / productImg.width, innerArea / productImg.height);
  const drawWidth = productImg.width * ratio;
  const drawHeight = productImg.height * ratio;
  const x = (MEEHSHO_SIZE - drawWidth) / 2;
  const y = (MEEHSHO_SIZE - drawHeight) / 2;

  ctx.drawImage(productImg, x, y, drawWidth, drawHeight);

  // 4. Export as JPEG with compression
  let quality = 0.92;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  
  // Basic loop to ensure it's under 200KB (approximate check by string length)
  // base64 size = (bytes * 4 / 3)
  while (dataUrl.length > MAX_FILE_SIZE_KB * 1024 * 1.33 && quality > 0.1) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
};

export const removeWhiteBackgroundClient = async (dataUrl: string): Promise<string> => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // If it's very white, make it transparent
    if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
