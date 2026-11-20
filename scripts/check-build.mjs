// Run by `npm run deploy` after the build and before `wrangler deploy`. It refuses
// to continue if the build could serve a request without the Zero Trust check.
// See docs/zero-trust.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const serverDir = "build/server";
const problems = [];

/** Every .js file under a folder. */
function scripts(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return scripts(path);
    return path.endsWith(".js") ? [path] : [];
  });
}

let files = [];
try {
  files = scripts(serverDir);
} catch {
  problems.push(`${serverDir} does not exist. Run "npm run build" first.`);
}
if (files.length === 0 && problems.length === 0) problems.push(`${serverDir} has no JavaScript in it.`);

// 1. The local-dev exception must not be in the code. A production build removes it;
//    a build made with NODE_ENV=development keeps it. Both markers come from
//    workers/zero-trust.ts and only exist while that exception does.
const markers = ["Zero Trust local-dev exception", "[::1]"];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length > 0) {
    problems.push(
      `${file} still contains the local dev exception to the Zero Trust check. ` +
        "This is a development build. Build without NODE_ENV=development and try again.",
    );
  }
}

// 2. Static files must go through the Worker, or they are served without the check.
try {
  const config = JSON.parse(readFileSync(join(serverDir, "wrangler.json"), "utf8"));
  if (config.assets?.run_worker_first !== true) {
    problems.push('assets.run_worker_first is not true in wrangler.jsonc, so static files would skip the Zero Trust check.');
  }
} catch {
  problems.push(`${serverDir}/wrangler.json is missing or unreadable, so the deployed settings could not be checked.`);
}

if (problems.length > 0) {
  console.error("\nNot deploying: this build is not safe to put on the internet.\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}
console.log("Build check passed: no local dev exception, and static files go through the Zero Trust check.");
