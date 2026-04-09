import { app, BrowserWindow, screen } from "electron";
import { join } from "path";
import type { WidgetInstance } from "@shared/types";
import { Store } from "./store";
import { getWidgetFixedSize } from "./widget-registry";

export class WindowManager {
  private widgetWindows: Map<string, BrowserWindow> = new Map();
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  private getPreloadPath(): string {
    return join(__dirname, "../preload/index.js");
  }

  private loadUrl(win: BrowserWindow, query: string): void {
    if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
      win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}?${query}`);
    } else {
      win.loadFile(join(__dirname, "../renderer/index.html"), {
        search: query,
      });
    }
  }

  createWidgetWindow(widget: WidgetInstance): BrowserWindow {
    const state = this.store.getState();
    const size = getWidgetFixedSize(widget.type);

    // Validate position is on-screen
    const pos = this.validatePosition(widget.freePosition, size);

    const win = new BrowserWindow({
      width: size.width,
      height: size.height,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: state.settings.alwaysOnTop,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.loadUrl(win, `widgetId=${widget.id}&mode=free`);

    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    win.on("moved", () => {
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const bounds = win.getBounds();
        this.store.updateWidgetPosition(widget.id, {
          freePosition: { x: bounds.x, y: bounds.y },
          freeSize: { width: bounds.width, height: bounds.height },
        });
      }, 300);
    });

    win.on("closed", () => {
      this.widgetWindows.delete(widget.id);
    });

    this.widgetWindows.set(widget.id, win);
    return win;
  }

  addWidget(widget: WidgetInstance): void {
    this.createWidgetWindow(widget);
  }

  removeWidgetWindow(id: string): void {
    const win = this.widgetWindows.get(id);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    this.widgetWindows.delete(id);
  }

  broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  setAlwaysOnTop(value: boolean): void {
    for (const win of this.widgetWindows.values()) {
      if (!win.isDestroyed()) win.setAlwaysOnTop(value);
    }
  }

  showAll(): void {
    for (const win of this.widgetWindows.values()) {
      if (!win.isDestroyed()) {
        win.show();
        win.focus();
      }
    }
  }

  getWidgetWindow(id: string): BrowserWindow | undefined {
    return this.widgetWindows.get(id);
  }

  private validatePosition(
    pos: { x: number; y: number },
    size: { width: number; height: number },
  ): { x: number; y: number } {
    const displays = screen.getAllDisplays();
    const onScreen = displays.some((d) => {
      const b = d.bounds;
      return (
        pos.x >= b.x - 50 &&
        pos.x < b.x + b.width &&
        pos.y >= b.y - 50 &&
        pos.y < b.y + b.height
      );
    });
    if (onScreen) return pos;

    const primary = screen.getPrimaryDisplay();
    return {
      x: primary.bounds.x + Math.round((primary.bounds.width - size.width) / 2),
      y:
        primary.bounds.y +
        Math.round((primary.bounds.height - size.height) / 2),
    };
  }
}
