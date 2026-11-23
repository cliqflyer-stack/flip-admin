/**
 * High-Resolution 9:16 Flyer Circular Generator
 * Renders professional retail promotional circulars from structured product data,
 * and computes exact normalized hotspot coordinates (x, y, width, height).
 */

export interface SheetProductRow {
  name: string;
  brand?: string | undefined;
  description?: string | undefined;
  regularPrice: number;
  offerPrice: number;
  unit?: string | undefined;
  category?: string | undefined;
  badgeText?: string | undefined;
  imageUrl?: string | undefined;
}

export interface GeneratedFlyerSlot {
  product: SheetProductRow;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  width: number; // 0..1 normalized
  height: number; // 0..1 normalized
}

export interface FlyerGeneratorOptions {
  title: string;
  subtitle?: string | undefined;
  merchantName: string;
  merchantLogoBg?: string | undefined;
  merchantLogoColor?: string | undefined;
  validityText?: string | undefined;
  themeStyle?: 'supermarket' | 'pharmacy' | 'fresh' | 'clearance' | undefined;
  gridColumns?: number; // default 2
  gridRows?: number; // default 3 or 4
}

export interface GeneratedFlyerOutput {
  canvas: HTMLCanvasElement;
  file: File;
  slots: GeneratedFlyerSlot[];
  width: number;
  height: number;
}

export async function generateFlyerFromProducts(
  products: SheetProductRow[],
  options: FlyerGeneratorOptions
): Promise<GeneratedFlyerOutput> {
  const width = 1080;
  const height = 1920; // 9:16 mobile standard

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  const theme = options.themeStyle || 'supermarket';
  const brandColor = options.merchantLogoBg || (theme === 'pharmacy' ? '#075E50' : theme === 'fresh' ? '#2E7D32' : '#C62828');
  const brandTextColor = options.merchantLogoColor || '#FFFFFF';

  // 1. Background fill
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Background pattern / gradient
  const headerGradient = ctx.createLinearGradient(0, 0, width, 240);
  headerGradient.addColorStop(0, brandColor);
  headerGradient.addColorStop(1, adjustColor(brandColor, -30));
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, 240);

  // 2. Header Branding
  ctx.fillStyle = brandTextColor;
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.merchantName.toUpperCase(), 50, 75);

  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.fillText(options.title || 'WEEKLY SPECIALS', 50, 140);

  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(options.subtitle || 'Prices valid for limited time only · While supplies last', 50, 185);

  // Validity badge pill in header right
  if (options.validityText) {
    const pillW = 280;
    const pillH = 50;
    const pillX = width - pillW - 50;
    const pillY = 95;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, pillX, pillY, pillW, pillH, 25);
    ctx.fill();

    ctx.fillStyle = brandColor;
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.validityText, pillX + pillW / 2, pillY + 32);
  }

  // 3. Grid Layout Calculation
  const cols = options.gridColumns || 2;
  const rows = options.gridRows || Math.ceil(Math.min(products.length, 8) / cols);
  const itemsToRender = products.slice(0, cols * rows);

  const gridTop = 270;
  const gridBottom = height - 120;
  const gridHeight = gridBottom - gridTop;
  const paddingX = 40;
  const gapX = 30;
  const gapY = 30;

  const cardW = (width - paddingX * 2 - gapX * (cols - 1)) / cols;
  const cardH = (gridHeight - gapY * (rows - 1)) / rows;

  const slots: GeneratedFlyerSlot[] = [];

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  };

  // 4. Render Product Cards & compute slots
  for (let i = 0; i < itemsToRender.length; i++) {
    const p = itemsToRender[i];
    if (!p) continue;
    const colIndex = i % cols;
    const rowIndex = Math.floor(i / cols);

    const cardX = paddingX + colIndex * (cardW + gapX);
    const cardY = gridTop + rowIndex * (cardH + gapY);

    // Save normalized coordinates for hotspot
    slots.push({
      product: p,
      x: Number((cardX / width).toFixed(4)),
      y: Number((cardY / height).toFixed(4)),
      width: Number((cardW / width).toFixed(4)),
      height: Number((cardH / height).toFixed(4)),
    });

    // Card white background container
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.stroke();

    // Image area
    const imgAreaH = cardH * 0.52;
    const imgPadding = 18;
    const imgX = cardX + imgPadding;
    const imgY = cardY + imgPadding;
    const imgW = cardW - imgPadding * 2;
    const imgH = imgAreaH - imgPadding;

    let imageDrawn = false;
    if (p.imageUrl) {
      try {
        const loaded = await loadImage(p.imageUrl);
        ctx.save();
        roundRect(ctx, imgX, imgY, imgW, imgH, 12);
        ctx.clip();
        drawImageProp(ctx, loaded, imgX, imgY, imgW, imgH);
        ctx.restore();
        imageDrawn = true;
      } catch {
        imageDrawn = false;
      }
    }

    if (!imageDrawn) {
      // Clean fallback product graphic
      ctx.fillStyle = '#F1F5F9';
      roundRect(ctx, imgX, imgY, imgW, imgH, 12);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const initial = p.brand ? p.brand.slice(0, 2).toUpperCase() : p.name.slice(0, 2).toUpperCase();
      ctx.fillText(initial, imgX + imgW / 2, imgY + imgH / 2 + 10);
    }

    // Promotional Badge Pill (top right or top left of card)
    const badgeText = p.badgeText || (p.regularPrice > p.offerPrice ? `SAVE $${(p.regularPrice - p.offerPrice).toFixed(2)}` : 'HOT DEAL');
    if (badgeText) {
      const bW = Math.min(cardW - 40, ctx.measureText(badgeText).width + 30);
      const bH = 32;
      const bX = cardX + 16;
      const bY = cardY + 16;

      ctx.fillStyle = '#E11D48'; // Rose red discount badge
      roundRect(ctx, bX, bY, bW, bH, 16);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, bX + bW / 2, bY + 21);
    }

    // Product Title
    const contentY = cardY + imgAreaH + 16;
    ctx.textAlign = 'left';

    if (p.brand) {
      ctx.fillStyle = '#64748B';
      ctx.font = '600 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(p.brand.toUpperCase(), cardX + 20, contentY);
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const maxTitleW = cardW - 40;
    const titleText = truncateText(ctx, p.name, maxTitleW);
    ctx.fillText(titleText, cardX + 20, contentY + (p.brand ? 28 : 16));

    // Price section
    const priceY = cardY + cardH - 26;

    // Big Bold Offer Price
    ctx.fillStyle = '#B91C1C';
    ctx.font = '900 38px system-ui, -apple-system, sans-serif';
    const priceStr = `$${p.offerPrice.toFixed(2)}`;
    ctx.fillText(priceStr, cardX + 20, priceY);

    const priceWidth = ctx.measureText(priceStr).width;

    // Strikethrough Regular Price if present
    if (p.regularPrice && p.regularPrice > p.offerPrice) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '17px system-ui, -apple-system, sans-serif';
      const regStr = `reg. $${p.regularPrice.toFixed(2)}`;
      const regX = cardX + 20 + priceWidth + 14;
      ctx.fillText(regStr, regX, priceY - 6);

      const regW = ctx.measureText(regStr).width;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(regX - 2, priceY - 11);
      ctx.lineTo(regX + regW + 2, priceY - 11);
      ctx.stroke();
    }

    // Unit
    if (p.unit) {
      ctx.fillStyle = '#64748B';
      ctx.font = '15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`/${p.unit}`, cardX + 20 + priceWidth + 14, priceY + 14);
    }
  }

  // 5. Footer Bar
  const footerY = height - 85;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, footerY, width, 85);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Interactive Digital Circular · Tap any deal for instant details and store availability', width / 2, footerY + 50);

  // Convert canvas to File
  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas blob conversion failed'))), 'image/jpeg', 0.92);
  });

  const cleanFileName = `flyer_generated_${Date.now()}.jpg`;
  const file = new File([blob], cleanFileName, { type: 'image/jpeg' });

  return {
    canvas,
    file,
    slots,
    width,
    height,
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(`${str}...`).width > maxWidth) {
    str = str.slice(0, -1);
  }
  return `${str}...`;
}

function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const imgAspect = imgW / imgH;
  const targetAspect = w / h;

  let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;
  if (imgAspect > targetAspect) {
    sWidth = imgH * targetAspect;
    sx = (imgW - sWidth) / 2;
  } else {
    sHeight = imgW / targetAspect;
    sy = (imgH - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

function adjustColor(color: string, amount: number): string {
  return '#' + color.replace(/^#/, '').replace(/../g, (c) => ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2));
}
