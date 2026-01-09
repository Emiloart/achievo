export async function waitUntil(
  predicate: () => Promise<boolean> | boolean,
  options: { timeoutMs: number; intervalMs: number; label?: string },
) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await predicate();
    if (result) return;
    if (Date.now() - start > options.timeoutMs) {
      const label = options.label ? ` (${options.label})` : "";
      throw new Error(`waitUntil timeout${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}
