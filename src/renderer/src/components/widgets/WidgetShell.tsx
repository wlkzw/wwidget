import type { ReactNode } from "react";
import { GlassPane } from "../common/GlassPane";
import { TitleBar } from "../common/TitleBar";
import "./WidgetShell.css";

interface WidgetShellProps {
  title: string;
  widgetId: string;
  mode: "free" | "panel";
  children: ReactNode;
  titleBarActions?: ReactNode;
}

export function WidgetShell({
  title,
  widgetId,
  mode,
  children,
  titleBarActions,
}: WidgetShellProps): React.JSX.Element {
  const handleClose = (): void => {
    window.electronAPI.widgets.delete(widgetId);
    if (mode === "free") {
      window.electronAPI.window.close();
    }
  };

  return (
    <GlassPane className="widget-shell widget-enter" style={{ height: "100%" }}>
      <TitleBar
        title={title}
        onClose={handleClose}
        showMinimize={mode === "free"}
        draggable={mode === "free"}
      >
        {titleBarActions}
      </TitleBar>
      <div className="widget-shell__content">{children}</div>
    </GlassPane>
  );
}
