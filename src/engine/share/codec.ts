import { compressToUint8Array, decompressFromUint8Array } from "lz-string";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;
    const c1 = (triplet >> 18) & 63;
    const c2 = (triplet >> 12) & 63;
    const c3 = (triplet >> 6) & 63;
    const c4 = triplet & 63;

    output += BASE64_ALPHABET[c1];
    output += BASE64_ALPHABET[c2];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[c3] : "=";
    output += i + 2 < bytes.length ? BASE64_ALPHABET[c4] : "=";
  }
  return output;
}

function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  const length = clean.length;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((length * 3) / 4 - padding);

  let byteIndex = 0;
  for (let i = 0; i < length; i += 4) {
    const c1 = BASE64_ALPHABET.indexOf(clean[i]);
    const c2 = BASE64_ALPHABET.indexOf(clean[i + 1]);
    const c3 = BASE64_ALPHABET.indexOf(clean[i + 2]);
    const c4 = BASE64_ALPHABET.indexOf(clean[i + 3]);
    const triple = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = triple & 255;
  }

  return bytes;
}

function base64FromBytes(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return globalThis.btoa(binary);
  }
  return encodeBase64(bytes);
}

function bytesFromBase64(base64: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return decodeBase64(base64);
}

function toBase64Url(bytes: Uint8Array): string {
  const base64 = base64FromBytes(bytes);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad !== 0) {
    base64 = base64 + "=".repeat(4 - pad);
  }
  return bytesFromBase64(base64);
}

export function encodePayloadToToken(json: string): string {
  const compressed = compressToUint8Array(json);
  return toBase64Url(compressed);
}

export function decodeTokenToPayload(token: string): string {
  const bytes = fromBase64Url(token);
  const json = decompressFromUint8Array(bytes);
  if (typeof json !== "string") {
    throw new Error("SHARE_DECODE_FAILED");
  }
  return json;
}
