const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

async function requestJson(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function expectStatus(path, expected) {
  const { res, text } = await requestJson(path);
  if (res.status !== expected) {
    throw new Error(`Expected ${expected} for ${path}, got ${res.status}: ${text}`);
  }
}

async function run() {
  await expectStatus("/health", 200);
  await expectStatus("/ready", 200);

  const openapi = await requestJson("/openapi.json");
  if (openapi.res.status !== 200 || !openapi.json?.openapi) {
    throw new Error(`OpenAPI spec unavailable: ${openapi.res.status}`);
  }

  const nonce = await requestJson("/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: "0x0000000000000000000000000000000000000001" }),
  });
  if (![200, 201].includes(nonce.res.status)) {
    throw new Error(`Auth nonce failed: ${nonce.res.status}`);
  }

  const availability = await requestJson("/usernames/availability?name=smoke-test");
  if (availability.res.status !== 200) {
    throw new Error(`Availability check failed: ${availability.res.status}`);
  }

  // Basic read endpoint
  await expectStatus("/health/chain", 200);

  // eslint-disable-next-line no-console
  console.log("Smoke test passed.");
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Smoke test failed:", err.message);
  process.exit(1);
});
