/**
 * Contract tests for the first screen of a fresh install.
 *
 * The identity landing is what a first launch opens on, so it is the one
 * screen that has to be right before anything else is. What these pin is copy
 * and ground colour rather than behaviour, and both are literals, so they read
 * the source and the stylesheet on disk instead of rendering (the same
 * approach whisperMark.test.mjs takes with the logo stylesheet).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

const flow = fs.readFileSync(
  path.join(here, "MachineOnboardingFlow.tsx"),
  "utf8",
);
const components = fs.readFileSync(
  path.join(here, "..", "..", "..", "shared/styles/globals/components.css"),
  "utf8",
);

/** The landing's one line of copy, verbatim. */
const LANDING_TAGLINE =
  "Your people, your agents and your projects, in one place.";

const EM_DASH = "—";

/**
 * The identity page's JSX, from its slide-transition key to the error slot
 * that follows the tagline. Scoped so the assertions read the copy George
 * sees, not the code comments around it.
 */
function landingBlock() {
  const start = flow.indexOf("machine-identity-");
  assert.notEqual(start, -1, "identity landing block not found");
  const end = flow.indexOf("{error ?", start);
  assert.notEqual(end, -1, "end of the identity landing block not found");
  return flow.slice(start, end);
}

test("the landing names Whisper Work and carries no em dash", () => {
  const landing = landingBlock();

  assert.ok(
    landing.includes(LANDING_TAGLINE),
    "landing tagline drifted from the pinned copy",
  );
  assert.equal(
    landing.includes(EM_DASH),
    false,
    "em dash in the landing copy: house style bans it",
  );
  assert.match(landing, /Whisper Work/);
  assert.equal(/\bBuzz\b/.test(landing), false, "Buzz is still on the landing");
});

test("the landing paints the logomark, not the retired wordmark bitmap", () => {
  assert.equal(
    flow.includes("/landing/buzz-wordmark.png"),
    false,
    "the chartreuse Buzz wordmark is still referenced",
  );
  assert.match(landingBlock(), /<OnboardingMark\s+alt="Whisper Work"/);
});

test("the onboarding shell paints the Whisper Work dark ground", () => {
  assert.equal(
    components.includes("#d7d72e"),
    false,
    "the bee chartreuse is still an onboarding value",
  );
  assert.match(components, /--buzz-onboarding-shell-bottom:\s*#0f0f0f/);
  assert.match(components, /--buzz-onboarding-shell-top:\s*#141414/);
});
