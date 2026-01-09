import { readRuntime, writeRuntime } from "./runtime";
import { startBackend, restartBackend } from "./startBackend";

let backendReady = false;

export async function ensureBackend(options?: { rpcFailMode?: boolean }) {
  const runtime = readRuntime();
  if (!backendReady || !runtime.backend?.baseUrl) {
    await startBackend(options);
    backendReady = true;
  }
  return readRuntime();
}

export async function restartBackendForE2E(options?: { rpcFailMode?: boolean }) {
  await restartBackend(options);
  backendReady = true;
  return readRuntime();
}

export function getRuntime() {
  return readRuntime();
}
