import { randomUUID } from "crypto";
import type {
  WidgetType,
  WidgetInstance,
  MemoData,
  TimerData,
  WeatherData,
  SystemMonitorData,
  ClipboardHistoryData,
  ColorPickerData,
} from "@shared/types";

interface WidgetDefaults {
  displayName: string;
  defaultSize: { width: number; height: number };
  defaultData:
    | MemoData
    | TimerData
    | WeatherData
    | SystemMonitorData
    | ClipboardHistoryData
    | ColorPickerData;
}

const WIDGET_DEFAULTS: Record<WidgetType, WidgetDefaults> = {
  memo: {
    displayName: "Memo",
    defaultSize: { width: 280, height: 200 },
    defaultData: { content: "" } as MemoData,
  },
  timer: {
    displayName: "Timer",
    defaultSize: { width: 220, height: 165 },
    defaultData: { mode: "stopwatch", countdownSeconds: 300 } as TimerData,
  },
  weather: {
    displayName: "Weather",
    defaultSize: { width: 280, height: 220 },
    defaultData: { city: "", units: "metric" } as WeatherData,
  },
  "system-monitor": {
    displayName: "System Monitor",
    defaultSize: { width: 260, height: 190 },
    defaultData: { _tag: "system-monitor" } as SystemMonitorData,
  },
  "clipboard-history": {
    displayName: "Clipboard",
    defaultSize: { width: 300, height: 360 },
    defaultData: { _tag: "clipboard-history" } as ClipboardHistoryData,
  },
  "color-picker": {
    displayName: "Color Picker",
    defaultSize: { width: 260, height: 300 },
    defaultData: { colors: [] } as ColorPickerData,
  },
};

let positionCounter = 0;

export function createWidgetInstance(type: WidgetType): WidgetInstance {
  const defaults = WIDGET_DEFAULTS[type];
  const x = 100 + positionCounter * 40;
  const y = 100 + positionCounter * 40;
  positionCounter = (positionCounter + 1) % 8;

  return {
    id: randomUUID(),
    type,
    freePosition: { x, y },
    freeSize: { ...defaults.defaultSize },
    data: { ...defaults.defaultData },
    createdAt: new Date().toISOString(),
  };
}

export function getWidgetDisplayName(type: WidgetType): string {
  return WIDGET_DEFAULTS[type].displayName;
}

export function getWidgetFixedSize(type: WidgetType): {
  width: number;
  height: number;
} {
  return { ...WIDGET_DEFAULTS[type].defaultSize };
}
