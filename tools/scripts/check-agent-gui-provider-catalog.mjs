import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePinnedPnpmCommand } from "./pinned-pnpm-command.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, "../..");
const [pnpmExecutable, ...pnpmArguments] = resolvePinnedPnpmCommand({
  workspaceRoot
});

execFileSync(
  process.execPath,
  [join(scriptDirectory, "generate-agent-gui-provider-catalog.mjs"), "--check"],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

execFileSync(
  process.execPath,
  [join(scriptDirectory, "check-agent-provider-strategy-boundaries.mjs")],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

execFileSync(
  pnpmExecutable,
  [
    ...pnpmArguments,
    "--filter",
    "@tutti-os/agent-gui",
    "exec",
    "vitest",
    "run",
    "providerIdentityCatalog.spec.ts",
    "providerIconAssets.spec.ts"
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);
