import { BuzzMark } from "./BuzzMark";

/**
 * Upstream's bee with beating wings, kept only as a name.
 *
 * Whisper Work has no bee. The five call sites are all loading gates that
 * need a visual anchor while the app boots, so this renders the static
 * logomark rather than nothing, the gates stay composed, and the pages that
 * want motion reach for {@link FuzzyLogo} instead.
 *
 * The export and its single `className` prop are unchanged so the call sites
 * keep their sizing.
 */
export function FlappingBee({ className }: { className?: string }) {
  return <BuzzMark className={className} />;
}
