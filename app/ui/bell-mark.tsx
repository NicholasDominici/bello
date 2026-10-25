/* eslint-disable @next/next/no-img-element -- pixel art skips the optimizer so it stays crisp and keeps its animation frames */
export function BellMark({
  size = 40,
  intro = false,
  ringing = false,
}: {
  size?: number;
  intro?: boolean;
  ringing?: boolean;
}) {
  return (
    <span
      className="bell-mark"
      data-ringing={ringing || undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src={intro ? "/bell-intro.webp" : "/bell.png"} width={size} height={size} alt="" />
    </span>
  );
}
