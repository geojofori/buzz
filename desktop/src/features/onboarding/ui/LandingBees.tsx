import { OnboardingMark } from "./OnboardingChrome";

/**
 * The onboarding identity page's decoration.
 *
 * Upstream scattered 38 pointer-repelled bees across the page. Whisper Work
 * has no bee, and 38 copies of the logomark would be noise rather than
 * decoration, so the field is gone and only the corner mark remains. The
 * export keeps upstream's name so `MachineOnboardingFlow` is untouched.
 *
 * The corner mark stays for positional continuity with the step chrome, which
 * pins the same mark in the same place. It is smaller and dimmed here because
 * the landing now carries the mark full size in the middle of the page, and
 * two of the same glyph at similar weight would fight.
 */
export function LandingBees() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute left-6 top-12 block w-8 opacity-50">
        <OnboardingMark className="h-auto w-full" />
      </span>
    </div>
  );
}
