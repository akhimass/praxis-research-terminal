import { ReactNode, useEffect, useState } from "react";

interface Props {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * Cross-fades from skeleton (300ms out) → content (200ms in).
 * Skeleton is fully unmounted from the DOM once content is visible.
 */
export function SkeletonWrapper({ isLoading, skeleton, children }: Props) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [contentVisible, setContentVisible] = useState(!isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      setContentVisible(false);
      return;
    }
    // Content arrived — fade skeleton out, then fade content in.
    const t1 = window.setTimeout(() => setShowSkeleton(false), 300);
    const t2 = window.setTimeout(() => setContentVisible(true), 60);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [isLoading]);

  if (showSkeleton) {
    return (
      <div
        style={{
          opacity: isLoading ? 1 : 0,
          transition: "opacity 300ms ease",
          height: "100%",
          width: "100%",
        }}
      >
        {skeleton}
      </div>
    );
  }
  return (
    <div
      style={{
        opacity: contentVisible ? 1 : 0,
        transition: "opacity 200ms ease",
        height: "100%",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
