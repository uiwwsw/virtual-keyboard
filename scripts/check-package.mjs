import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFile, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { VirtualInput, VirtualInputProvider } from "../dist/index.js";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
await readFile(new URL("../" + packageJson.types, import.meta.url), "utf8");
const temp = await mkdtemp(join(tmpdir(), "virtual-keyboard-package-"));
try {
  const [pack] = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp],
      { encoding: "utf8" },
    ),
  );
  execFileSync("tar", ["-xzf", join(temp, pack.filename), "-C", temp]);
  await symlink(
    fileURLToPath(new URL("../node_modules", import.meta.url)),
    join(temp, "node_modules"),
  );
  const packed = await import(
    pathToFileURL(join(temp, "package/dist/index.js")).href
  );
  assert.ok(packed.VirtualInput);
  assert.match(
    renderToString(
      createElement(
        packed.VirtualInputProvider,
        null,
        createElement(packed.VirtualInput, { defaultValue: "포장 검사" }),
      ),
    ),
    /data-value="포장 검사"/,
  );
  const paths = pack.files.map((file) => file.path);
  assert.ok(paths.includes("dist/index.js"));
  assert.ok(paths.includes("dist/types/index.d.ts"));
  assert.ok(
    paths.every(
      (path) => !/demo-dist|\.test\.|dist\/index\.html|dist\/assets/.test(path),
    ),
    "Package must not ship demo or test files",
  );
  const html = renderToString(
    createElement(
      VirtualInputProvider,
      null,
      createElement(VirtualInput, {
        defaultValue: "안녕하세요",
        "aria-label": "이름",
      }),
    ),
  );
  assert.match(html, /role="textbox"/);
  assert.match(html, /data-value="안녕하세요"/);
  console.log(
    `Package contains ${paths.length} files, imports successfully, and renders without browser globals.`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
