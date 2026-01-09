require("ts-node/register/transpile-only");
require("./global-teardown")()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("E2E teardown complete");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("E2E teardown failed", err);
    process.exit(1);
  });
