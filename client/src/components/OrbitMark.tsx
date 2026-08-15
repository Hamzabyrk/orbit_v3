import type { SVGProps } from "react";

const LOGO_ASSET = "/manus-storage/orbit-video-transparent-icon_f536ab39.png";

const vortexArcs = [
  "M50 11 C70 11 86 27 88 47",
  "M89 51 C89 71 74 87 54 89",
  "M50 89 C30 89 14 74 12 54",
  "M11 50 C11 30 26 14 46 12",
  "M68 19 C82 29 88 42 86 57",
  "M32 81 C18 71 12 58 14 43",
];

export function OrbitMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-label="ORBIT" role="img" className={`orbit-mark ${className}`} {...props}>
      <image className="orbit-mark-original" href={LOGO_ASSET} x="8" y="8" width="84" height="84" preserveAspectRatio="xMidYMid meet" />
      <g className="orbit-mark-vortex" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.4">
        {vortexArcs.map((path, index) => <path key={path} className={`orbit-mark-arc orbit-mark-arc-${index + 1}`} d={path} />)}
      </g>
      <circle className="orbit-mark-core" cx="50" cy="50" r="3.7" />
    </svg>
  );
}
