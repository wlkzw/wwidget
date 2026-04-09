import type { CSSProperties, ReactNode } from "react";

interface GlassPaneProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GlassPane({
  children,
  className = "",
  style,
}: GlassPaneProps): React.JSX.Element {
  return (
    <div className={`glass-pane ${className}`} style={style}>
      {children}
    </div>
  );
}
