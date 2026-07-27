export interface FileHashes {
  sha1: string;
  sha256: string;
  sha512: string;
}

export async function computeFileHashes(buffer: ArrayBuffer): Promise<FileHashes> {
  const [sha1, sha256, sha512] = await Promise.all([
    crypto.subtle.digest("SHA-1", buffer),
    crypto.subtle.digest("SHA-256", buffer),
    crypto.subtle.digest("SHA-512", buffer),
  ]);
  const toHex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { sha1: toHex(sha1), sha256: toHex(sha256), sha512: toHex(sha512) };
}

export function computeShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Array(256).fill(0);
  for (const b of bytes) counts[b]++;
  let entropy = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / bytes.length;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

export interface FileSignature {
  type: string;
  mime: string;
  matched: boolean;
}

const SIGNATURES: { magic: number[]; offset?: number; type: string; mime: string; extensions: string[] }[] = [
  { magic: [0x4d, 0x5a], type: "Windows PE Executable", mime: "application/x-msdownload", extensions: ["exe", "dll", "sys"] },
  { magic: [0x7f, 0x45, 0x4c, 0x46], type: "ELF Executable", mime: "application/x-elf", extensions: ["elf", "so", "bin"] },
  { magic: [0x25, 0x50, 0x44, 0x46], type: "PDF Document", mime: "application/pdf", extensions: ["pdf"] },
  { magic: [0x50, 0x4b, 0x03, 0x04], type: "ZIP Archive (or Office/JAR/APK)", mime: "application/zip", extensions: ["zip", "docx", "xlsx", "pptx", "jar", "apk"] },
  { magic: [0x89, 0x50, 0x4e, 0x47], type: "PNG Image", mime: "image/png", extensions: ["png"] },
  { magic: [0xff, 0xd8, 0xff], type: "JPEG Image", mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { magic: [0x47, 0x49, 0x46, 0x38], type: "GIF Image", mime: "image/gif", extensions: ["gif"] },
  { magic: [0x52, 0x61, 0x72, 0x21], type: "RAR Archive", mime: "application/x-rar-compressed", extensions: ["rar"] },
  { magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], type: "7-Zip Archive", mime: "application/x-7z-compressed", extensions: ["7z"] },
  { magic: [0x1f, 0x8b], type: "GZIP Archive", mime: "application/gzip", extensions: ["gz", "tgz"] },
  { magic: [0x25, 0x21, 0x50, 0x53], type: "PostScript Document", mime: "application/postscript", extensions: ["ps"] },
  { magic: [0xd0, 0xcf, 0x11, 0xe0], type: "Legacy Office Document (OLE)", mime: "application/x-ole-storage", extensions: ["doc", "xls", "ppt"] },
  { magic: [0x49, 0x44, 0x33], type: "MP3 Audio (ID3)", mime: "audio/mpeg", extensions: ["mp3"] },
  { magic: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], type: "MP4 Video", mime: "video/mp4", extensions: ["mp4"] },
];

export function detectFileType(bytes: Uint8Array, claimedExtension?: string): {
  detected: FileSignature | null;
  extensionMismatch: boolean;
} {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (bytes.length < offset + sig.magic.length) continue;
    const matches = sig.magic.every((byte, i) => bytes[offset + i] === byte);
    if (matches) {
      const ext = claimedExtension?.toLowerCase().replace(".", "");
      const extensionMismatch = Boolean(ext && !sig.extensions.includes(ext));
      return { detected: { type: sig.type, mime: sig.mime, matched: true }, extensionMismatch };
    }
  }
  return { detected: null, extensionMismatch: false };
}

export function extractStrings(bytes: Uint8Array, minLength = 4, maxResults = 300): string[] {
  const results: string[] = [];
  let current = "";
  for (let i = 0; i < bytes.length && results.length < maxResults; i++) {
    const byte = bytes[i];
    const isPrintable = byte >= 32 && byte <= 126;
    if (isPrintable) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= minLength) results.push(current);
      current = "";
    }
  }
  if (current.length >= minLength && results.length < maxResults) results.push(current);
  return results;
}

export interface PeInfo {
  isPe: boolean;
  machine?: string;
  numberOfSections?: number;
  timestamp?: string;
  subsystem?: string;
  characteristics?: string[];
  suspicious: string[];
}

const MACHINE_TYPES: Record<number, string> = {
  0x014c: "x86 (32-bit)",
  0x8664: "x64 (64-bit)",
  0x01c4: "ARM",
  0xaa64: "ARM64",
};

const SUBSYSTEMS: Record<number, string> = {
  1: "Native",
  2: "Windows GUI",
  3: "Windows Console",
  9: "Windows CE GUI",
};

export function parsePeHeader(bytes: Uint8Array): PeInfo {
  const suspicious: string[] = [];
  if (bytes.length < 64 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
    return { isPe: false, suspicious };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const peOffset = view.getUint32(0x3c, true);
  if (peOffset + 24 > bytes.length || view.getUint32(peOffset, true) !== 0x00004550) {
    suspicious.push("MZ header present but PE signature is missing or corrupt — possibly not a valid Windows executable, or intentionally obfuscated.");
    return { isPe: false, suspicious };
  }

  const machine = view.getUint16(peOffset + 4, true);
  const numberOfSections = view.getUint16(peOffset + 6, true);
  const timestamp = view.getUint32(peOffset + 8, true);
  const characteristicsFlags = view.getUint16(peOffset + 22, true);
  const optHeaderOffset = peOffset + 24;
  const subsystem = bytes.length > optHeaderOffset + 68 ? view.getUint16(optHeaderOffset + 68, true) : undefined;

  const characteristics: string[] = [];
  if (characteristicsFlags & 0x0002) characteristics.push("Executable");
  if (characteristicsFlags & 0x2000) characteristics.push("DLL");
  if (characteristicsFlags & 0x0001) characteristics.push("Relocations stripped");
  if (characteristicsFlags & 0x0020) characteristics.push("Large address aware");

  if (timestamp === 0) suspicious.push("Compile timestamp is zeroed — common technique used by packers/obfuscators to hide build metadata.");
  const compileDate = timestamp > 0 ? new Date(timestamp * 1000) : null;
  if (compileDate && compileDate.getTime() > Date.now()) suspicious.push("Compile timestamp is in the future — the timestamp has likely been tampered with.");
  if (numberOfSections > 12) suspicious.push(`Unusually high section count (${numberOfSections}) — can indicate packing or obfuscation.`);
  if (numberOfSections === 0) suspicious.push("Zero sections reported — file may be corrupt or deliberately malformed.");

  return {
    isPe: true,
    machine: MACHINE_TYPES[machine] ?? `Unknown (0x${machine.toString(16)})`,
    numberOfSections,
    timestamp: compileDate ? compileDate.toISOString() : "Not set",
    subsystem: subsystem !== undefined ? SUBSYSTEMS[subsystem] ?? `Unknown (${subsystem})` : undefined,
    characteristics,
    suspicious,
  };
}
