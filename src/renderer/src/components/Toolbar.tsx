import { useState, useEffect } from "react";
import type { WidgetType, ToolbarPosition, Settings } from "@shared/types";
import "./Toolbar.css";

interface ToolbarItem {
  type: WidgetType | "launcher";
  label: string;
  icon: string;
}

const ITEMS: ToolbarItem[] = [
  { type: "memo", label: "Memo", icon: "📝" },
  { type: "timer", label: "Timer", icon: "⏱️" },
  { type: "weather", label: "Weather", icon: "🌤️" },
  { type: "system-monitor", label: "System", icon: "📊" },
  { type: "clipboard-history", label: "Clipboard", icon: "📋" },
  { type: "color-picker", label: "Color", icon: "🎨" },
  { type: "launcher", label: "Launcher", icon: "🔍" },
];

export function Toolbar({
  initialPosition,
}: {
  initialPosition: ToolbarPosition;
}): React.JSX.Element {
  const [position, setPosition] = useState<ToolbarPosition>(initialPosition);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const unsub = window.electronAPI.toolbar.onSettingsChanged(
      (settings: Settings) => {
        setPosition(settings.toolbarPosition);
      },
    );
    return unsub;
  }, []);

  const isVertical = position === "left" || position === "right";

  const handleClick = (item: ToolbarItem): void => {
    if (item.type === "launcher") {
      window.electronAPI.toolbar.openLauncher();
    } else {
      window.electronAPI.toolbar.addWidget(item.type);
    }
  };

  return (
    <div
      className={`toolbar ${isVertical ? "toolbar--vertical" : "toolbar--horizontal"}`}
    >
      <div className="toolbar__glass">
        {/* Drag handle */}
        <div className="toolbar__drag-handle" title="Drag to move">
          <span className="toolbar__drag-dots">{isVertical ? "⋯" : "⋮"}</span>
        </div>
        <div className="toolbar__divider" />
        <div className="toolbar__items">
          {ITEMS.map((item) => (
            <button
              key={item.type}
              className="toolbar__btn"
              title={item.label}
              onClick={() => handleClick(item)}
              onMouseEnter={() => setHoveredItem(item.type)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="toolbar__icon">{item.icon}</span>
              {hoveredItem === item.type && (
                <span
                  className={`toolbar__tooltip toolbar__tooltip--${position}`}
                >
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
