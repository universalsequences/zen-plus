export const generateColor = (input: string): string => {
  // Use a more robust hashing function (FNV-1a)
  let hash = 2166136261; // 32-bit FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  hash = hash >>> 0; // Convert to unsigned 32-bit integer

  // Generate hue from hash, avoiding blue range (180-240)
  let hue = hash % 360;
  if (hue >= 180 && hue <= 240) {
    hue = (hue + 120) % 360; // Shift blue to magenta
  }

  // High saturation and lightness for vibrancy
  const saturation = 85 + (hash % 15); // 85-99
  const lightness = 60 + (hash % 15);  // 60-74

  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = lightness / 100 - c / 2;
  let r, g, b;

  if (hue < 60) { [r, g, b] = [c, x, 0]; }
  else if (hue < 120) { [r, g, b] = [x, c, 0]; }
  else if (hue < 180) { [r, g, b] = [0, c, x]; }
  else if (hue < 240) { [r, g, b] = [0, x, c]; }
  else if (hue < 300) { [r, g, b] = [x, 0, c]; }
  else { [r, g, b] = [c, 0, x]; }

  // Convert to hex
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
