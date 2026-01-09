/**
 * Formats wallet addresses into Achievo URI identifiers.
 */
export function toAchievoId(addr: string): string {
  try {
    return `achv:${addr.toLowerCase()}`;
  } catch {
    return "achv:unknown";
  }
}

export function shortAchievoId(addr: string): string {
  const id = toAchievoId(addr);
  // achv:0x....
  if (id.length <= 14) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}
