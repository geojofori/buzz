import markDark from "./whisper-mark-dark.png";
import markLight from "./whisper-mark-light.png";
import "./buzz-logo-animation.css";

/**
 * The WhisperCreate logomark, painted as a plain bitmap, no SMIL, no
 * scripting, no animation machinery, so it renders complete on the very
 * first frame regardless of animation support.
 *
 * Both theme variants are emitted and the inactive one is hidden in CSS
 * (`html.dark` decides). That keeps the component synchronous: there is no
 * theme hook to read, nothing to re-render on a theme switch, and no flash of
 * the wrong artwork on a hard reload before scripting starts. The two files
 * share one canvas size, so swapping between them never shifts layout.
 *
 * The exported name is upstream's; only the artwork changed. `className` is
 * applied to each image rather than to a wrapper, so the sizing utilities the
 * call sites already pass (`h-auto w-full`, `w-5`, …) keep working unchanged.
 */
export function BuzzMark({ className }: { className?: string }) {
  const classes = ["buzz-mark", "whisper-mark", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        className={`${classes} whisper-mark--light`}
        src={markLight}
      />
      <img
        alt=""
        aria-hidden="true"
        className={`${classes} whisper-mark--dark`}
        src={markDark}
      />
    </>
  );
}
