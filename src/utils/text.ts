const WINDOWS_1252_BYTE_LOOKUP: Record<string, number> = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

const MOJIBAKE_PATTERN = /[ÃÂâðœŸ]/;
const MOJIBAKE_MARKER_PATTERN = /[ÃÂâðœŸ]/g;

function encodeWindows1252(value: string) {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (typeof codePoint !== "number") {
      return null;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mappedByte = WINDOWS_1252_BYTE_LOOKUP[char];

    if (typeof mappedByte !== "number") {
      return null;
    }

    bytes.push(mappedByte);
  }

  return new Uint8Array(bytes);
}

function getMojibakeScore(value: string) {
  return value.match(MOJIBAKE_MARKER_PATTERN)?.length ?? 0;
}

export function repairMojibakeText(value: string) {
  if (!value || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  const bytes = encodeWindows1252(value);

  if (!bytes) {
    return value;
  }

  try {
    const decodedValue = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    return getMojibakeScore(decodedValue) <= getMojibakeScore(value)
      ? decodedValue
      : value;
  } catch {
    return value;
  }
}

export function repairOptionalText(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const repairedValue = repairMojibakeText(value).trim();

  return repairedValue || undefined;
}

export function repairTextArray(values: string[]) {
  return values.map((value) => repairMojibakeText(value));
}
