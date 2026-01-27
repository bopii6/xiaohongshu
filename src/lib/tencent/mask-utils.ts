import sharp from 'sharp';

export interface MaskResult {
  buffer: Buffer;
  ratio: number;
  edgeRatio: number;
  isUsable: boolean;
  width: number;
  height: number;
  threshold: number;
}

interface MaskOptions {
  backgroundThreshold: number;
  sampleStep: number;
  alphaThreshold: number;
  blurSigma: number;
  minForegroundRatio: number;
  maxForegroundRatio: number;
  maxEdgeForegroundRatio: number;
  maxAdjustments: number;
}

function parseBase64Image(input: string): Buffer {
  const dataUriMatch = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUriMatch) {
    return Buffer.from(dataUriMatch[2], 'base64');
  }
  return Buffer.from(input, 'base64');
}

function getMaskOptions(): MaskOptions {
  return {
    backgroundThreshold: Number(process.env.TENCENT_AIART_MASK_BG_THRESHOLD) || 28,
    sampleStep: Number(process.env.TENCENT_AIART_MASK_SAMPLE_STEP) || 8,
    alphaThreshold: Number(process.env.TENCENT_AIART_MASK_ALPHA_THRESHOLD) || 8,
    blurSigma: Number(process.env.TENCENT_AIART_MASK_BLUR_SIGMA) || 0.6,
    minForegroundRatio: Number(process.env.TENCENT_AIART_MASK_MIN_RATIO) || 0.02,
    maxForegroundRatio: Number(process.env.TENCENT_AIART_MASK_MAX_RATIO) || 0.9,
    maxEdgeForegroundRatio: Number(process.env.TENCENT_AIART_MASK_EDGE_MAX) || 0.12,
    maxAdjustments: Number(process.env.TENCENT_AIART_MASK_MAX_ADJUST) || 3
  };
}

function sampleBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  step: number
) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const clampStep = Math.max(1, step);
  const sample = (x: number, y: number) => {
    const idx = (y * width + x) * channels;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
    count += 1;
  };

  for (let x = 0; x < width; x += clampStep) {
    sample(x, 0);
    sample(x, height - 1);
  }

  for (let y = 0; y < height; y += clampStep) {
    sample(0, y);
    sample(width - 1, y);
  }

  return {
    r: Math.round(r / Math.max(1, count)),
    g: Math.round(g / Math.max(1, count)),
    b: Math.round(b / Math.max(1, count))
  };
}

export async function createMaskFromBase64(base64Input: string): Promise<MaskResult> {
  const options = getMaskOptions();
  const imageBuffer = parseBase64Image(base64Input);
  const image = sharp(imageBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  if (!width || !height) {
    throw new Error('Invalid image dimensions');
  }

  const bg = sampleBackgroundColor(data, width, height, channels, options.sampleStep);
  const totalPixels = width * height;
  const edgeBand = Math.max(2, Math.round(Math.min(width, height) * 0.03));
  const isEdge = (x: number, y: number) =>
    x < edgeBand || y < edgeBand || x >= width - edgeBand || y >= height - edgeBand;

  const buildMask = (threshold: number) => {
    const mask = Buffer.alloc(totalPixels);
    let foreground = 0;
    let edgeForeground = 0;
    let edgeTotal = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = channels > 3 ? data[idx + 3] : 255;

        if (a <= options.alphaThreshold) {
          mask[y * width + x] = 0;
          continue;
        }

        const diff =
          Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
        const isForeground = diff > threshold * 3;
        mask[y * width + x] = isForeground ? 255 : 0;
        if (isForeground) {
          foreground += 1;
          if (isEdge(x, y)) {
            edgeForeground += 1;
          }
        }

        if (isEdge(x, y)) {
          edgeTotal += 1;
        }
      }
    }

    return {
      mask,
      ratio: foreground / Math.max(1, totalPixels),
      edgeRatio: edgeForeground / Math.max(1, edgeTotal)
    };
  };

  let currentThreshold = options.backgroundThreshold;
  let result = buildMask(currentThreshold);

  for (let attempt = 0; attempt < options.maxAdjustments; attempt += 1) {
    if (
      result.ratio >= options.minForegroundRatio &&
      result.ratio <= options.maxForegroundRatio &&
      result.edgeRatio <= options.maxEdgeForegroundRatio
    ) {
      break;
    }

    if (result.ratio > options.maxForegroundRatio || result.edgeRatio > options.maxEdgeForegroundRatio) {
      currentThreshold = Math.min(160, Math.round(currentThreshold * 1.5));
    } else if (result.ratio < options.minForegroundRatio) {
      currentThreshold = Math.max(6, Math.round(currentThreshold * 0.6));
    }

    result = buildMask(currentThreshold);
  }

  const isUsable =
    result.ratio >= options.minForegroundRatio &&
    result.ratio <= options.maxForegroundRatio &&
    result.edgeRatio <= options.maxEdgeForegroundRatio;

  let maskImage = sharp(result.mask, { raw: { width, height, channels: 1 } });
  if (options.blurSigma > 0) {
    maskImage = maskImage.blur(options.blurSigma);
  }

  return {
    buffer: await maskImage.png().toBuffer(),
    ratio: result.ratio,
    edgeRatio: result.edgeRatio,
    isUsable,
    width,
    height,
    threshold: currentThreshold
  };
}
