// "Made with Nuvai" credit, linking to nuvai.qa. The logo is Nuvai's own traced wordmark drawn the way nuvai.qa draws it:
// two masks (letter fills and outlines) painted with CSS colours, so it suits the white header and the black footer.
import s from "./site.module.css";

const RATIO = 2278 / 836;

export function MadeWithNuvai({ height = 12, paper, ink, className = "" }: { height?: number; paper: string; ink: string; className?: string }) {
  const layer = (kind: "paper" | "ink", color: string) => (
    <span
      aria-hidden="true"
      className={s.nuvaiLayer}
      style={{
        backgroundColor: color,
        WebkitMask: `url(/brand/nuvai-wordmark-${kind}.svg) center / contain no-repeat`,
        mask: `url(/brand/nuvai-wordmark-${kind}.svg) center / contain no-repeat`,
      }}
    />
  );
  return (
    <a className={`${s.madeWith} ${className}`} href="https://nuvai.qa" target="_blank" rel="noopener">
      <span>Made with</span>
      <span className={s.nuvaiLogo} role="img" aria-label="Nuvai" style={{ width: Math.round(height * RATIO), height }}>
        {layer("paper", paper)}
        {layer("ink", ink)}
      </span>
    </a>
  );
}
