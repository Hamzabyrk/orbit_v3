import type { SVGProps } from "react";

const centerPath = "M50 50 C50 50 50 50 50 50 C50 50 50 50 50 50 C50 50 50 50 50 50 Z";

export function OrbitMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-label="ORBIT" role="img" className={`orbit-mark ${className}`} {...props}>
      <g className="orbit-mark-wing orbit-mark-wing-one"><path d="M50 50 C57 22 79 12 90 22 C78 27 69 36 64 50 C60 49 55 49 50 50 Z" /></g>
      <g className="orbit-mark-wing orbit-mark-wing-two"><path d="M50 50 C78 43 92 57 91 73 C84 65 74 59 61 58 C59 55 55 52 50 50 Z" /></g>
      <g className="orbit-mark-wing orbit-mark-wing-three"><path d="M50 50 C65 75 56 94 40 94 C47 86 50 75 48 63 C49 58 50 54 50 50 Z" /></g>
      <g className="orbit-mark-wing orbit-mark-wing-four"><path d="M50 50 C42 78 21 88 10 78 C22 73 30 64 36 50 C40 50 45 50 50 50 Z" /></g>
      <g className="orbit-mark-wing orbit-mark-wing-five"><path d="M50 50 C23 57 8 44 10 28 C17 36 27 41 39 42 C43 45 47 48 50 50 Z" /></g>
      <g className="orbit-mark-wing orbit-mark-wing-six"><path d="M50 50 C35 24 45 6 61 8 C55 15 52 26 53 38 C52 43 51 47 50 50 Z" /></g>
      <circle className="orbit-mark-core" cx="50" cy="50" r="3.4" />
    </svg>
  );
}
