/**
 * Contract tests for the Whisper Work logomark components.
 *
 * The rename swapped upstream's animated bee for the WhisperCreate logomark
 * while keeping every export name and prop, so the 17 call sites are
 * untouched. These tests pin the two things that swap could silently break:
 *
 *  1. The theme swap is CSS-only. Both artworks are always in the DOM and
 *     `buzz-logo-animation.css` hides one off the `dark` class on <html>.
 *     jsdom does not apply the stylesheet (the test loader stubs CSS to an
 *     empty module), so the class contract is asserted on the elements and
 *     the matching rules are asserted against the stylesheet on disk. Either
 *     half drifting on its own is what would ship the wrong-colour mark.
 *  2. Callers' sizing classes still land on the images, and the loading
 *     treatment is a pulse the caller can switch off.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, test } from "node:test";

import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

const stylesheet = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "buzz-logo-animation.css",
  ),
  "utf8",
);

before(() => {
  Object.assign(globalThis, {
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    window: dom.window,
  });
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
});

afterEach(async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});

after(() => dom.window.close());

function marks(container) {
  return [...container.querySelectorAll("img.whisper-mark")];
}

test("BuzzMark emits both theme variants and no bee geometry", async () => {
  const { render } = await import("@testing-library/react");
  const { BuzzMark } = await import("./BuzzMark.tsx");

  const { container } = render(React.createElement(BuzzMark, {}));
  const images = marks(container);

  assert.equal(images.length, 2, "one image per theme");
  assert.equal(
    images.filter((img) => img.classList.contains("whisper-mark--light"))
      .length,
    1,
  );
  assert.equal(
    images.filter((img) => img.classList.contains("whisper-mark--dark")).length,
    1,
  );
  // Decorative: the accessible name comes from the wrapper that needs one.
  for (const img of images) {
    assert.equal(img.getAttribute("aria-hidden"), "true");
    assert.equal(img.getAttribute("alt"), "");
    assert.ok(img.getAttribute("src"), "each variant has a source");
  }
  assert.equal(container.querySelectorAll("svg").length, 0, "no bee left");
});

test("BuzzMark puts the caller's sizing classes on both images", async () => {
  const { render } = await import("@testing-library/react");
  const { BuzzMark } = await import("./BuzzMark.tsx");

  const { container } = render(
    React.createElement(BuzzMark, { className: "h-auto w-9" }),
  );

  for (const img of marks(container)) {
    assert.ok(img.classList.contains("h-auto"));
    assert.ok(img.classList.contains("w-9"));
    // Upstream's hook class is kept so existing selectors still match.
    assert.ok(img.classList.contains("buzz-mark"));
  }
});

test("the stylesheet hides exactly one variant per theme", () => {
  // Light is the default state, so the dark artwork starts hidden.
  assert.match(stylesheet, /\.whisper-mark--dark\s*\{\s*display:\s*none;/);
  assert.match(
    stylesheet,
    /html\.dark \.whisper-mark--light\s*\{\s*display:\s*none;/,
  );
  assert.match(
    stylesheet,
    /html\.dark \.whisper-mark--dark\s*\{\s*display:\s*block;/,
  );
  // The pulse must stop for readers who asked for less motion.
  assert.match(stylesheet, /prefers-reduced-motion: reduce/);
});

test("FlappingBee renders the static mark rather than a bee", async () => {
  const { render } = await import("@testing-library/react");
  const { FlappingBee } = await import("./FlappingBee.tsx");

  const { container } = render(
    React.createElement(FlappingBee, { className: "w-28" }),
  );

  assert.equal(marks(container).length, 2);
  assert.equal(container.querySelectorAll(".bee-wing").length, 0);
  assert.ok(marks(container)[0].classList.contains("w-28"));
});

test("FuzzyLogo pulses by default and stops when the parent drives opacity", async () => {
  const { render } = await import("@testing-library/react");
  const { FuzzyLogo } = await import("./FuzzyLogo.tsx");

  const pulsing = render(
    React.createElement(FuzzyLogo, { ariaLabel: "Working" }),
  );
  const root = pulsing.container.querySelector(".buzz-logo");
  assert.ok(root.classList.contains("buzz-logo--pulse"));
  assert.ok(root.classList.contains("buzz-logo--compact"));
  assert.equal(root.getAttribute("role"), "img");
  assert.equal(root.getAttribute("aria-label"), "Working");
  // The background is the caller's, never the logo's own field.
  assert.equal(root.classList.contains("buzz-logo--background"), false);

  pulsing.unmount();

  const still = render(
    React.createElement(FuzzyLogo, { ariaLabel: "", pulse: false }),
  );
  assert.equal(
    still.container
      .querySelector(".buzz-logo")
      .classList.contains("buzz-logo--pulse"),
    false,
  );
});

test("LandingBees keeps one corner mark and no swarm", async () => {
  const { render } = await import("@testing-library/react");
  const { LandingBees } = await import(
    "@/features/onboarding/ui/LandingBees.tsx"
  );

  const { container } = render(React.createElement(LandingBees, {}));

  assert.equal(
    container.querySelectorAll("img").length,
    1,
    "one corner mark, no swarm",
  );
  // The onboarding shell paints the brand's dark ground under every theme, so
  // its mark is the single light-on-dark bitmap rather than the html.dark
  // variant pair, which would hide the mark outright under a light theme.
  assert.equal(
    marks(container).length,
    0,
    "corner mark should not use the theme-swap pair",
  );
});
