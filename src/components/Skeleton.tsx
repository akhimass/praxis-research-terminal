import { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = "16px", className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("praxis-skeleton", className)}
      style={{ width, height, ...style }}
    />
  );
}
