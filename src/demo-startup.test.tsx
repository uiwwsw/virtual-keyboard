import { describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import App from "./App";

describe("demo first render", () => {
  it("keeps the real first-screen nodes when hydration attaches, instead of replacing an SEO placeholder", async () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(createElement(App));
    document.body.append(host);
    const heading = host.querySelector("h1");
    expect(heading?.textContent).toContain("입력의 감각까지");
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(host, createElement(App), {
        onRecoverableError: (e) => errors.push(e),
      });
    });
    expect(host.querySelector("h1")).toBe(heading);
    expect(errors).toEqual([]);
    await act(async () => root.unmount());
    host.remove();
  });
});
