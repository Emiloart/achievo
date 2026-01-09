require("ts-node/register/transpile-only");
require("./global-setup")()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("E2E setup complete");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("E2E setup failed", err);
    process.exit(1);
  });
