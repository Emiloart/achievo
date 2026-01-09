const crypto = require("crypto");

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function parseArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const method = (parseArg("method") || "GET").toUpperCase();
const path = parseArg("path") || "/";
const bodyRaw = parseArg("body") || "";
const key = parseArg("key") || process.env.ADMIN_API_KEY;
const secret = parseArg("secret") || process.env.ADMIN_HMAC_SECRET;

if (!key || !secret) {
  console.error("ADMIN_API_KEY and ADMIN_HMAC_SECRET are required.");
  process.exit(1);
}

let bodyString = "";
if (bodyRaw) {
  try {
    const parsed = JSON.parse(bodyRaw);
    bodyString = stableStringify(parsed);
  } catch {
    bodyString = bodyRaw;
  }
}

const ts = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomUUID();
const bodyHash = sha256Hex(bodyString);
const payload = `${method}\n${path}\n${ts}\n${nonce}\n${bodyHash}`;
const sig = hmac(secret, payload);

console.log(
  JSON.stringify(
    {
      method,
      path,
      headers: {
        "x-admin-key": key,
        "x-admin-ts": ts,
        "x-admin-nonce": nonce,
        "x-admin-sig": sig,
      },
      bodyHash,
      body: bodyString,
    },
    null,
    2,
  ),
);
