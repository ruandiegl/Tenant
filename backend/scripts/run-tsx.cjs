const path = require("node:path");
const { spawnSync } = require("node:child_process");

const tsxCli = require.resolve("tsx/cli");
const preload = path.join(__dirname, "windows-node-workaround.cjs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const workaroundOption = `--require="${preload.replaceAll("\\", "/")}"`;

const result = spawnSync(process.execPath, [tsxCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: existingNodeOptions
      ? `${existingNodeOptions} ${workaroundOption}`
      : workaroundOption
  }
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
