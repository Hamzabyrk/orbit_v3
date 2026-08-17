import type { ImgHTMLAttributes } from "react";

const LOGO_ASSET = "/orbit-icon.svg";

type OrbitMarkProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src"
> & {
  inverted?: boolean;
  priority?: boolean;
};

export function OrbitMark({
  className = "",
  inverted = false,
  priority = false,
  ...props
}: OrbitMarkProps) {
  return (
    <img
      src={LOGO_ASSET}
      alt="ORBIT marka işareti"
      width={100}
      height={100}
      loading="eager"
      decoding="sync"
      fetchPriority={priority ? "high" : "auto"}
      className={`orbit-mark${inverted ? " orbit-mark--inverted" : ""} ${className}`}
      {...props}
    />
  );
}
