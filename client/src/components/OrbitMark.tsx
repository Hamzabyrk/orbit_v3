import type { SVGProps } from "react";

const LOGO_ASSET = "/manus-storage/orbit-video-transparent-icon_f536ab39.png";

export function OrbitMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-label="ORBIT" role="img" className={`orbit-mark ${className}`} {...props}>
      <image className="orbit-mark-original" href={LOGO_ASSET} x="8" y="8" width="84" height="84" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
