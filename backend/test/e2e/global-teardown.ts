import { readRuntime } from "./utils/runtime";
import { dropTestSchema } from "./utils/testDb";

function stripSchema(urlRaw: string) {
  try {
    const url = new URL(urlRaw);
    url.searchParams.delete("schema");
    return url.toString();
  } catch {
    return urlRaw;
  }
}

module.exports = async () => {
  let runtime;
  try {
    runtime = readRuntime();
  } catch {
    return;
  }

  if (runtime.backend?.pid) {
    try {
      process.kill(runtime.backend.pid);
    } catch {
      // ignore
    }
  }

  if (runtime.chain?.pid) {
    try {
      process.kill(runtime.chain.pid);
    } catch {
      // ignore
    }
  }

  const adminUrl = runtime.db.adminUrl || stripSchema(runtime.db.databaseUrl);
  await dropTestSchema(adminUrl, runtime.db.schema);
};
