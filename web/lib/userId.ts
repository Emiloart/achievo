/**
 * Formats numeric user IDs into the Achievo ID display format.
 */
export function formatAchievoId(id?: bigint | number | null): string | null {
  if (!id) return null;
  const value = typeof id === "bigint" ? id : BigInt(id);
  if (value === 0n) return null;
  const digits = value.toString().padStart(10, "0");
  return `ACHUSR-${digits}`;
}
