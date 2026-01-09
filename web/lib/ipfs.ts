/**
 * IPFS upload helpers.
 *
 * Routes uploads through the backend to preserve auth and storage policies.
 */
import { getApiErrorMessage } from "./apiError";

/** Upload result returned by the backend storage API. */
export type Uploaded = { cid: string; uri: string };

// Requests route through the Next.js API proxy to preserve cookie credentials.
const API_BASE = "/api";

async function postFile(path: string, data: FormData, token?: string): Promise<Uploaded> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: data,
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, res.statusText || "Upload failed."));
  }
  const json = await res.json();
  return json as Uploaded;
}

async function postJson(path: string, body: any, token?: string): Promise<Uploaded> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, res.statusText || "Upload failed."));
  }
  return (await res.json()) as Uploaded;
}

/** Uploads JSON content via the backend storage API. */
export async function uploadJSON(obj: any, token?: string): Promise<Uploaded> {
  if (!API_BASE) throw new Error("API base not configured");
  return postJson("/files/json", obj, token);
}

/** Uploads a file via the backend storage API. */
export async function uploadFile(file: File, token?: string): Promise<Uploaded> {
  if (!API_BASE) throw new Error("API base not configured");
  const form = new FormData();
  form.append("file", file);
  return postFile("/files/upload", form, token);
}

/** Converts an IPFS URI to an HTTP gateway URL. */
export function ipfsToHttp(uri?: string) {
  if (!uri) return "";
  const trimmed = uri.trim();
  if (trimmed.startsWith("ipfs://")) {
    let path = trimmed.slice("ipfs://".length);
    if (path.startsWith("ipfs/")) path = path.slice("ipfs/".length);
    if (path.startsWith("/")) path = path.slice(1);
    return `https://ipfs.io/ipfs/${path}`;
  }
  return trimmed;
}
