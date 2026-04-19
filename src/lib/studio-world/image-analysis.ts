import type { StudioSourceImageRecord } from "@/lib/studio-world/types";

const byteToHex = (value: number) => value.toString(16).padStart(2, "0");

const rgbToHex = (red: number, green: number, blue: number) =>
  `#${byteToHex(red)}${byteToHex(green)}${byteToHex(blue)}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type PngInfo = {
  width: number;
  height: number;
};

const readUInt32 = (buffer: Buffer, offset: number) => buffer.readUInt32BE(offset);

const maybeReadPngInfo = (buffer: Buffer): PngInfo | null => {
  if (buffer.length < 24) return null;
  const signature = buffer.subarray(0, 8);
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!signature.equals(expected)) return null;
  return {
    width: readUInt32(buffer, 16),
    height: readUInt32(buffer, 20),
  };
};

const maybeReadJpegInfo = (buffer: Buffer): PngInfo | null => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      return null;
    }
    const isStartOfFrame =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  return null;
};

const hashBucket = (red: number, green: number, blue: number) =>
  `${red >> 4}:${green >> 4}:${blue >> 4}`;

const brighten = (hexColor: string, amount: number) => {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return rgbToHex(
    clamp(Math.round(red + (255 - red) * amount), 0, 255),
    clamp(Math.round(green + (255 - green) * amount), 0, 255),
    clamp(Math.round(blue + (255 - blue) * amount), 0, 255),
  );
};

const darken = (hexColor: string, amount: number) => {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return rgbToHex(
    clamp(Math.round(red * (1 - amount)), 0, 255),
    clamp(Math.round(green * (1 - amount)), 0, 255),
    clamp(Math.round(blue * (1 - amount)), 0, 255),
  );
};

export const resolveImageSize = (buffer: Buffer): PngInfo => {
  const png = maybeReadPngInfo(buffer);
  if (png) return png;
  const jpeg = maybeReadJpegInfo(buffer);
  if (jpeg) return jpeg;
  return { width: 1024, height: 1024 };
};

export const buildImagePaletteFromBuffer = (buffer: Buffer) => {
  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();
  const step = Math.max(3, Math.floor(buffer.length / 1800));
  for (let index = 0; index + 2 < buffer.length; index += step) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? 0;
    const blue = buffer[index + 2] ?? 0;
    const key = hashBucket(red, green, blue);
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
      current.red += red;
      current.green += green;
      current.blue += blue;
    } else {
      buckets.set(key, { count: 1, red, green, blue });
    }
  }

  const dominant = Array.from(buckets.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
    .map((bucket) =>
      rgbToHex(
        Math.round(bucket.red / bucket.count),
        Math.round(bucket.green / bucket.count),
        Math.round(bucket.blue / bucket.count),
      ),
    );

  if (dominant.length === 0) {
    return ["#8b5cf6", "#ec4899", "#22d3ee", "#111827"];
  }
  while (dominant.length < 4) {
    dominant.push(brighten(dominant[dominant.length - 1] ?? "#8b5cf6", 0.12));
  }
  return dominant;
};

export const buildAvatarImageNotes = (image: StudioSourceImageRecord) => {
  const primary = image.palette[0] ?? "#8b5cf6";
  const secondary = image.palette[1] ?? brighten(primary, 0.18);
  return {
    skinLike: brighten(primary, 0.35),
    hairLike: darken(primary, 0.72),
    outfitMain: secondary,
    outfitTrim: brighten(secondary, 0.18),
    accessory: image.palette[2] ?? brighten(primary, 0.45),
    backdrop: image.palette[3] ?? darken(primary, 0.5),
  };
};

export const buildImageIntensitySamples = (buffer: Buffer) => {
  const samples: number[] = [];
  const step = Math.max(4, Math.floor(buffer.length / 4096));
  for (let index = 0; index + 2 < buffer.length; index += step) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? 0;
    const blue = buffer[index + 2] ?? 0;
    const intensity = clamp(
      Math.round(((red + green + blue) / (255 * 3)) * 1000) / 1000,
      0,
      1,
    );
    samples.push(intensity);
  }
  if (samples.length === 0) {
    return [0.25, 0.5, 0.75, 0.5];
  }
  return samples.slice(0, 256);
};

const samplePixel = (buffer: Buffer, offset: number) => {
  const red = buffer[offset] ?? 0;
  const green = buffer[offset + 1] ?? red;
  const blue = buffer[offset + 2] ?? green;
  return { red, green, blue };
};

export const buildImageSampleGridFromBuffer = (buffer: Buffer, cells = 12) => {
  const samples: number[][] = [];
  const length = buffer.length;
  if (length <= 3) {
    return Array.from({ length: cells }, () =>
      Array.from({ length: cells }, () => 0.5),
    );
  }
  for (let row = 0; row < cells; row += 1) {
    const rowValues: number[] = [];
    for (let col = 0; col < cells; col += 1) {
      const normalizedIndex = (row * cells + col) / Math.max(cells * cells - 1, 1);
      const offset = Math.min(
        Math.max(0, Math.floor(normalizedIndex * (length - 3))),
        length - 3,
      );
      const { red, green, blue } = samplePixel(buffer, offset);
      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      rowValues.push(clamp(Math.round(luminance * 1000) / 1000, 0, 1));
    }
    samples.push(rowValues);
  }
  return samples;
};
