const net = require("net");
const { execSync } = require("child_process");

const host = process.env.TEST_DB_HOST || "localhost";
const port = Number(process.env.TEST_DB_PORT || 54321);
const timeoutMs = Number(process.env.TEST_DB_WAIT_MS || 60000);
const intervalMs = Number(process.env.TEST_DB_WAIT_INTERVAL_MS || 1000);
const containerName = process.env.TEST_DB_CONTAINER || "achievo_test_db";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readContainerHealth() {
  try {
    const output = execSync(`docker inspect ${containerName}`, { stdio: ["ignore", "pipe", "ignore"] });
    const info = JSON.parse(output.toString());
    const status = info?.[0]?.State?.Health?.Status || null;
    return status;
  } catch {
    return null;
  }
}

function tcpCheck() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 2000 });
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => resolve(false));
  });
}

async function waitForReady() {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const health = readContainerHealth();
    if (health === "healthy") return true;
    if (health === "unhealthy") {
      await sleep(intervalMs);
      continue;
    }
    const tcpReady = await tcpCheck();
    if (tcpReady) return true;
    await sleep(intervalMs);
  }
  return false;
}

waitForReady()
  .then((ready) => {
    if (!ready) {
      console.error("Test database did not become ready within timeout.");
      process.exit(1);
    }
    console.log("Test database is ready.");
  })
  .catch((error) => {
    console.error("Test database readiness check failed:", error?.message || error);
    process.exit(1);
  });
