// Rebuilds dist/ whenever a file in src/ (or the build script) changes:
//   npm run watch        (pair it with VS Code Live Server, which serves dist/)
// Also used by `npm run dev` (scripts/serve.mjs --watch).

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildScript = join(projectDir, "scripts", "build.mjs");

// Each build runs in a fresh process so edited sources are always re-read.
function build() {
  return new Promise((resolve) => {
    spawn(process.execPath, [buildScript], { stdio: "inherit" }).on("exit", resolve);
  });
}

export async function startWatch() {
  await build();
  let timer = null;
  let running = false;
  let pending = false;
  const rebuild = async () => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    await build();
    running = false;
    if (pending) {
      pending = false;
      rebuild();
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  };
  watch(join(projectDir, "src"), { recursive: true }, schedule);
  watch(buildScript, schedule);
  console.log("Watching src/ — dist/ is rebuilt on every change.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWatch();
}
