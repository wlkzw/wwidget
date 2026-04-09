import { useState, useEffect } from "react";
import type {
  WidgetInstance,
  MemoData,
  TimerData,
  WeatherData,
  ColorPickerData,
  ToolbarPosition,
} from "@shared/types";
import { MemoWidget } from "./components/widgets/MemoWidget";
import { TimerWidget } from "./components/widgets/TimerWidget";
import { WeatherWidget } from "./components/widgets/WeatherWidget";
import { SystemMonitorWidget } from "./components/widgets/SystemMonitorWidget";
import { ClipboardWidget } from "./components/widgets/ClipboardWidget";
import { ColorPickerWidget } from "./components/widgets/ColorPickerWidget";
import { Launcher } from "./components/Launcher";
import { ColorPickerOverlay } from "./components/ColorPickerOverlay";
import { Toolbar } from "./components/Toolbar";
import { WidgetShell } from "./components/widgets/WidgetShell";
import "./App.css";

const WIDGET_TITLES: Record<string, string> = {
  memo: "Memo",
  timer: "Timer",
  weather: "Weather",
  "system-monitor": "System",
  "clipboard-history": "Clipboard",
  "color-picker": "Color Picker",
};

function renderWidget(widget: WidgetInstance): React.JSX.Element | null {
  switch (widget.type) {
    case "memo":
      return <MemoWidget widgetId={widget.id} data={widget.data as MemoData} />;
    case "timer":
      return (
        <TimerWidget widgetId={widget.id} data={widget.data as TimerData} />
      );
    case "weather":
      return (
        <WeatherWidget widgetId={widget.id} data={widget.data as WeatherData} />
      );
    case "system-monitor":
      return <SystemMonitorWidget />;
    case "clipboard-history":
      return <ClipboardWidget />;
    case "color-picker":
      return (
        <ColorPickerWidget
          widgetId={widget.id}
          data={widget.data as ColorPickerData}
        />
      );
    default:
      return null;
  }
}

function FreeWidgetView({ widgetId }: { widgetId: string }): React.JSX.Element {
  const [widget, setWidget] = useState<WidgetInstance | null>(null);

  useEffect(() => {
    window.electronAPI.widgets.getAll().then((widgets) => {
      const found = widgets.find((w) => w.id === widgetId);
      if (found) setWidget(found);
    });

    const unsub = window.electronAPI.widgets.onChanged((widgets) => {
      const found = widgets.find((w) => w.id === widgetId);
      if (found) setWidget(found);
    });
    return unsub;
  }, [widgetId]);

  if (!widget) return <div />;

  return (
    <WidgetShell
      title={WIDGET_TITLES[widget.type] || widget.type}
      widgetId={widget.id}
      mode="free"
    >
      {renderWidget(widget)}
    </WidgetShell>
  );
}

function App(): React.JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") as
    | "free"
    | "launcher"
    | "color-picker"
    | "toolbar"
    | null;
  const widgetId = params.get("widgetId");

  if (mode === "free" && widgetId) {
    return <FreeWidgetView widgetId={widgetId} />;
  }

  if (mode === "launcher") {
    return <Launcher />;
  }

  if (mode === "color-picker") {
    return <ColorPickerOverlay />;
  }

  if (mode === "toolbar") {
    const position = (params.get("position") || "right") as ToolbarPosition;
    return <Toolbar initialPosition={position} />;
  }

  return <div />;
}

export default App;
