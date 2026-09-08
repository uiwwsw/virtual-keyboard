import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
const { name, version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const result = spawnSync(
  "npm",
  ["view", `${name}@${version}`, "version", "--json"],
  { encoding: "utf8" },
);
let published;
if (result.status === 0 && JSON.parse(result.stdout) === version)
  published = true;
else {
  let code;
  for (const output of [result.stdout, result.stderr]) {
    try {
      code ??= JSON.parse(output)?.error?.code;
    } catch {
      /* npm logs may accompany the JSON. */
    }
  }
  if (code !== "E404")
    throw new Error(
      `Unable to verify ${name}@${version}; refusing to publish after a registry or authentication failure.`,
    );
  published = false;
}
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `published=${published}\n`);
console.log(
  `${name}@${version}: ${published ? "already published" : "not published"}`,
);
