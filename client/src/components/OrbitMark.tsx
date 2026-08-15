import type { SVGProps } from "react";

export function OrbitMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-label="ORBIT" role="img" className={`orbit-mark ${className}`} {...props}>
      <g className="orbit-mark-line orbit-mark-line-one">
        <path d="M50 7C26 8 9 26 9 49c0 22 16 40 39 44" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g className="orbit-mark-line orbit-mark-line-two">
        <path d="M50 7c24 1 41 19 41 42 0 22-16 40-39 44" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g className="orbit-mark-line orbit-mark-line-three">
        <path d="M27 26c15-14 39-11 50 5 12 17 6 40-11 50-15 9-34 4-43-10" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}
