import { BuzzMark } from "@/shared/ui/buzz-logo/BuzzMark";

/**
 * The onboarding identity page's decoration.
 *
 * Upstream scattered 38 pointer-repelled bees across the page. Whisper Work
 * has no bee, and 38 copies of the logomark would be noise rather than
 * decoration, so the field is gone and only the corner mark remains. The
 * export keeps upstream's name so `MachineOnboardingFlow` is untouched.
 */
export function LandingBees() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute left-6 top-12 block w-11">
        <BuzzMark className="h-auto w-full" />
      </span>
    </div>
  );
}
