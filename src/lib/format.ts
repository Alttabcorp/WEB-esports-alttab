export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPct(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}pp`;
}

export function encodeRiotId(gameName: string, tagLine: string): string {
  return encodeURIComponent(`${gameName}-${tagLine}`);
}

export function decodeRiotIdParam(param: string): string {
  // URL uses Nome-TAG (tag after last hyphen-like separator we used as -)
  const decoded = decodeURIComponent(param);
  const idx = decoded.lastIndexOf("-");
  if (idx <= 0) return decoded;
  return `${decoded.slice(0, idx)}#${decoded.slice(idx + 1)}`;
}
