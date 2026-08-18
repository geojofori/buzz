import type { CSSProperties } from "react";
import { BuzzMark } from "./BuzzMark";
import "./buzz-logo-animation.css";

/**
 * Variants survive from upstream's morph animation purely as a prop contract.
 * The Whisper Work mark is one fixed piece of artwork, so every variant paints
 * the same thing; the type is kept so the call sites that name a variant still
 * type-check.
 */
type VariantKey = "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";

export type BuzzLogoAnimationProps = {
  ariaLabel?: string;
  className?: string;
  fullScreen?: boolean;
  loop?: boolean;
  /**
   * Rest window between plays, in seconds. Retained for call-site
   * compatibility: the pulse is continuous, so there is no window to rest in.
   */
  loopRestSeconds?: number;
  reverse?: boolean;
  showBackground?: boolean;
  style?: CSSProperties;
  /** Retained for call-site compatibility; the mark has no texture filter. */
  textured?: boolean;
  variant?: VariantKey;
};

/**
 * The loading treatment for the Whisper Work mark.
 *
 * Upstream drew a bee assembling itself out of SMIL keyframes with a
 * feTurbulence texture over the top. That machinery is gone: the mark is one
 * piece of artwork, and the restraint the brand asks for is a slow opacity
 * pulse, driven from CSS (`buzz-logo--pulse`) and switched off under
 * `prefers-reduced-motion`. No JS timers, no SMIL, nothing to restart.
 *
 * The whole prop surface is preserved so the existing call sites compile and
 * keep their layout; `loop`, `loopRestSeconds`, `reverse`, `textured` and
 * `variant` no longer have anything to drive.
 */
export default function BuzzLogoAnimation({
  ariaLabel = "Whisper Work logo",
  className = "",
  fullScreen = true,
  showBackground = true,
  style,
}: BuzzLogoAnimationProps) {
  const classes = [
    "buzz-logo",
    fullScreen && "buzz-logo--screen",
    !fullScreen && "buzz-logo--compact",
    showBackground && "buzz-logo--background",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div aria-label={ariaLabel} className={classes} role="img" style={style}>
      <BuzzMark className="buzz-logo__mark" />
    </div>
  );
}
