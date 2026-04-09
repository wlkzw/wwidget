// ============ Widget Types ============

export type WidgetType =
  | "memo"
  | "timer"
  | "weather"
  | "system-monitor"
  | "clipboard-history"
  | "color-picker";
export type Theme = "light" | "dark";
export type ToolbarPosition = "left" | "right" | "top" | "bottom";

export interface MemoData {
  content: string;
}

export interface TimerData {
  mode: "stopwatch" | "countdown";
  countdownSeconds: number;
}

export interface WeatherData {
  city: string;
  units: "metric" | "imperial";
  lastFetch?: {
    temp: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
    fetchedAt: number;
  };
}

export interface SystemMonitorData {
  _tag: "system-monitor";
}

export interface ClipboardHistoryData {
  _tag: "clipboard-history";
}

export interface ColorPickerData {
  colors: ColorEntry[];
}

export interface ColorEntry {
  hex: string;
  rgb: string;
  timestamp: number;
}

export interface ClipboardEntry {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  pinned: boolean;
}

export interface SystemStats {
  cpuUsage: number;
  memTotal: number;
  memUsed: number;
  memPercent: number;
  uptime: number;
}

export type WidgetData =
  | MemoData
  | TimerData
  | WeatherData
  | SystemMonitorData
  | ClipboardHistoryData
  | ColorPickerData;

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  freePosition: { x: number; y: number };
  freeSize: { width: number; height: number };
  data: WidgetData;
  createdAt: string;
}

export interface Settings {
  weatherApiKey: string;
  alwaysOnTop: boolean;
  launchOnStartup: boolean;
  toolbarPosition: ToolbarPosition;
  toolbarVisible: boolean;
}

export interface AppState {
  version: number;
  theme: Theme;
  settings: Settings;
  widgets: WidgetInstance[];
  pinnedClipboard: ClipboardEntry[];
}

// ============ Launcher Types ============

export type LauncherResultType = "app" | "system" | "calc" | "web" | "file";

export interface LauncherResult {
  id: string;
  title: string;
  subtitle: string;
  type: LauncherResultType;
  icon?: string;
  action: string;
}

// ============ IPC Channels ============

export const IPC = {
  WIDGET_GET_ALL: "widget:get-all",
  WIDGET_CREATE: "widget:create",
  WIDGET_DELETE: "widget:delete",
  WIDGET_UPDATE_DATA: "widget:update-data",
  WIDGET_UPDATE_POSITION: "widget:update-position",
  THEME_GET: "theme:get",
  THEME_SET: "theme:set",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_CLOSE: "window:close",
  WINDOW_RESIZE: "window:resize",
  STATE_WIDGETS_CHANGED: "state:widgets-changed",
  STATE_THEME_CHANGED: "state:theme-changed",
  SYSTEM_STATS_GET: "system:stats-get",
  CLIPBOARD_GET_HISTORY: "clipboard:get-history",
  CLIPBOARD_PIN: "clipboard:pin",
  CLIPBOARD_DELETE: "clipboard:delete",
  CLIPBOARD_COPY: "clipboard:copy",
  CLIPBOARD_CLEAR: "clipboard:clear",
  CLIPBOARD_CHANGED: "clipboard:changed",
  LAUNCHER_SEARCH: "launcher:search",
  LAUNCHER_EXECUTE: "launcher:execute",
  LAUNCHER_HIDE: "launcher:hide",
  COLOR_PICK_START: "color:pick-start",
  COLOR_PICK_RESULT: "color:pick-result",
  TOOLBAR_SET_POSITION: "toolbar:set-position",
  TOOLBAR_TOGGLE: "toolbar:toggle",
  TOOLBAR_ADD_WIDGET: "toolbar:add-widget",
  TOOLBAR_OPEN_LAUNCHER: "toolbar:open-launcher",
} as const;

// ============ Position Update ============

export interface PositionUpdate {
  freePosition?: { x: number; y: number };
  freeSize?: { width: number; height: number };
}

// ============ Electron API (exposed via preload) ============

export interface ElectronAPI {
  widgets: {
    getAll(): Promise<WidgetInstance[]>;
    create(type: WidgetType): Promise<WidgetInstance>;
    delete(id: string): Promise<void>;
    updateData(id: string, data: WidgetData): Promise<void>;
    updatePosition(id: string, pos: PositionUpdate): Promise<void>;
    onChanged(callback: (widgets: WidgetInstance[]) => void): () => void;
  };
  theme: {
    get(): Promise<Theme>;
    set(theme: Theme): Promise<void>;
    onChanged(callback: (theme: Theme) => void): () => void;
  };
  window: {
    minimize(): void;
    close(): void;
    resize(deltaWidth: number, deltaHeight: number): void;
  };
  settings: {
    get(): Promise<Settings>;
    set(settings: Partial<Settings>): Promise<void>;
  };
  system: {
    getStats(): Promise<SystemStats>;
  };
  clipboard: {
    getHistory(): Promise<ClipboardEntry[]>;
    pin(id: string): Promise<void>;
    delete(id: string): Promise<void>;
    copy(id: string): Promise<void>;
    clear(): Promise<void>;
    onChanged(callback: (entries: ClipboardEntry[]) => void): () => void;
  };
  launcher: {
    search(query: string): Promise<LauncherResult[]>;
    execute(result: LauncherResult): Promise<void>;
    hide(): void;
  };
  colorPicker: {
    startPicking(): Promise<void>;
    onResult(callback: (hex: string, rgb: string) => void): () => void;
    onScreenshot(callback: (dataUrl: string) => void): () => void;
    sendPicked(hex: string, rgb: string): void;
    sendCancel(): void;
  };
  toolbar: {
    addWidget(type: WidgetType): Promise<void>;
    setPosition(position: ToolbarPosition): Promise<void>;
    openLauncher(): void;
    getSettings(): Promise<Settings>;
    onSettingsChanged(callback: (settings: Settings) => void): () => void;
  };
}
