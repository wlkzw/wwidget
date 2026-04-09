import { app, ipcMain } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import type {
  AppState,
  ClipboardEntry,
  Settings,
  WidgetData,
  WidgetInstance,
  PositionUpdate,
} from "@shared/types";

const CONFIG_FILE = "wwidget-config.json";

function defaultState(): AppState {
  return {
    version: 1,
    theme: "dark",
    settings: {
      weatherApiKey: "",
      alwaysOnTop: false,
      launchOnStartup: false,
      toolbarPosition: "right",
      toolbarVisible: true,
    },
    widgets: [],
    pinnedClipboard: [],
  };
}

export class Store {
  private state: AppState;
  private filePath: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.filePath = join(app.getPath("userData"), CONFIG_FILE);
    this.state = this.load();
  }

  private load(): AppState {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        return { ...defaultState(), ...JSON.parse(raw) };
      }
    } catch {
      console.error("Failed to load config, using defaults");
    }
    return defaultState();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 500);
  }

  private saveNow(): void {
    try {
      const tmp = this.filePath + ".tmp";
      writeFileSync(tmp, JSON.stringify(this.state, null, 2), "utf-8");
      renameSync(tmp, this.filePath);
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  }

  getState(): AppState {
    return this.state;
  }

  getWidgets(): WidgetInstance[] {
    return this.state.widgets;
  }

  getWidget(id: string): WidgetInstance | undefined {
    return this.state.widgets.find((w) => w.id === id);
  }

  addWidget(widget: WidgetInstance): void {
    this.state.widgets.push(widget);
    this.scheduleSave();
  }

  removeWidget(id: string): void {
    this.state.widgets = this.state.widgets.filter((w) => w.id !== id);
    this.scheduleSave();
  }

  updateWidgetData(id: string, data: WidgetData): void {
    const widget = this.getWidget(id);
    if (widget) {
      widget.data = data;
      this.scheduleSave();
    }
  }

  updateWidgetPosition(id: string, pos: PositionUpdate): void {
    const widget = this.getWidget(id);
    if (widget) {
      if (pos.freePosition) widget.freePosition = pos.freePosition;
      if (pos.freeSize) widget.freeSize = pos.freeSize;
      this.scheduleSave();
    }
  }

  setTheme(theme: AppState["theme"]): void {
    this.state.theme = theme;
    this.scheduleSave();
  }

  getSettings(): Settings {
    return this.state.settings;
  }

  updateSettings(partial: Partial<Settings>): void {
    Object.assign(this.state.settings, partial);
    this.scheduleSave();
  }

  getPinnedClipboard(): ClipboardEntry[] {
    return this.state.pinnedClipboard || [];
  }

  savePinnedClipboard(entries: ClipboardEntry[]): void {
    this.state.pinnedClipboard = entries;
    this.scheduleSave();
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveNow();
  }
}
