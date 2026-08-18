import { cn } from "@/shared/lib/cn";
import BuzzLogoAnimation, {
  type BuzzLogoAnimationProps,
} from "./BuzzLogoAnimation";

export type FuzzyLogoProps = {
  /** Retained for call-site compatibility; the mark has no texture filter. */
  fuzz?: boolean;
  className?: string;
  ariaLabel?: string;
  loop?: boolean;
  /** Retained for call-site compatibility; the pulse is continuous. */
  loopRestSeconds?: number;
  /** Set false when a parent drives its own opacity animation over the mark. */
  pulse?: boolean;
  reverse?: boolean;
  variant?: BuzzLogoAnimationProps["variant"];
};

/**
 * The Whisper Work mark as a live "still working" indicator: the same static
 * logomark {@link BuzzMark} paints, breathing on a slow opacity pulse.
 *
 * Pass `pulse={false}` where a parent already animates opacity over the mark,
 * so the two animations don't fight. `prefers-reduced-motion` drops the pulse
 * to a steady, slightly dimmed mark (see `buzz-logo-animation.css`).
 */
export function FuzzyLogo({
  className,
  ariaLabel = "Whisper Work logo",
  pulse = true,
}: FuzzyLogoProps) {
  return (
    <BuzzLogoAnimation
      ariaLabel={ariaLabel}
      className={cn(pulse && "buzz-logo--pulse", className)}
      fullScreen={false}
      showBackground={false}
    />
  );
}
