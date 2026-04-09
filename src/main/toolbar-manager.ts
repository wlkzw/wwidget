import { app, BrowserWindow, screen, ipcMain } from "electron";
import { join } from "path";
import { IPC } from "@shared/types";
import type { ToolbarPosition, WidgetType } from "@shared/types";
import { Store } from "./store";
import { WindowManager } from "./window-manager";
import { LauncherManager } from "./launcher-manager";
import { createWidgetInstance } from "./widget-registry";

const SNAP_THRESHOLD = 50;
const DETACH_DISTANCE = 80;
const VERTICAL_WIDTH = 56;
const VERTICAL_HEIGHT = 360;
const HORIZONTAL_WIDTH = 360;
const HORIZONTAL_HEIGHT = 56;

export class ToolbarManager {
  private win: BrowserWindow | null = null;
  private store: Store;
  private windowManager: WindowManager;
  private launcherManager: LauncherManager | null = null;
  private docked = true;
  private dockedBounds: Electron.Rectangle | null = null;

  constructor(store: Store, windowManager: WindowManager) {
    this.store = store;
    this.windowManager = windowManager;
  }

  setLauncherManager(lm: LauncherManager): void {
    this.launcherManager = lm;
  }

  init(): void {
    this.registerIpc();
    const settings = this.store.getSettings();
    if (settings.toolbarVisible) {
      this.show();
    }
  }

  private registerIpc(): void {
    ipcMain.handle(
      IPC.TOOLBAR_SET_POSITION,
      (_e, position: ToolbarPosition) => {
        this.store.updateSettings({ toolbarPosition: position });
        this.snapToEdge(position);
        if (this.win && !this.win.isDestroyed()) {
          this.win.webContents.send(
            "settings:changed",
            this.store.getSettings(),
          );
        }
      },
    );

    ipcMain.on(IPC.TOOLBAR_TOGGLE, () => {
      const settings = this.store.getSettings();
      const newVisible = !settings.toolbarVisible;
      this.store.updateSettings({ toolbarVisible: newVisible });
      if (newVisible) {
        this.show();
      } else {
        this.hide();
      }
    });

    ipcMain.handle(IPC.TOOLBAR_ADD_WIDGET, (_e, type: WidgetType) => {
      const widget = createWidgetInstance(type);
      this.store.addWidget(widget);
      this.windowManager.addWidget(widget);
    });

    ipcMain.on(IPC.TOOLBAR_OPEN_LAUNCHER, () => {
      this.launcherManager?.show();
    });
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

  private getSnappedBounds(position: ToolbarPosition): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const display = screen.getPrimaryDisplay();
    const { x, y, width, height } = display.workArea;
    const isVertical = position === "left" || position === "right";
    const w = isVertical ? VERTICAL_WIDTH : HORIZONTAL_WIDTH;
    const h = isVertical ? VERTICAL_HEIGHT : HORIZONTAL_HEIGHT;

    switch (position) {
      case "left":
        return { x, y: y + Math.round((height - h) / 2), width: w, height: h };
      case "right":
        return {
          x: x + width - w,
          y: y + Math.round((height - h) / 2),
          width: w,
          height: h,
        };
      case "top":
        return { x: x + Math.round((width - w) / 2), y, width: w, height: h };
      case "bottom":
        return {
          x: x + Math.round((width - w) / 2),
          y: y + height - h,
          width: w,
          height: h,
        };
    }
  }

  private snapToEdge(position: ToolbarPosition): void {
    if (!this.win || this.win.isDestroyed()) return;
    const bounds = this.getSnappedBounds(position);
    this.win.setBounds(bounds);
    this.docked = true;
    this.dockedBounds = bounds;
  }

  private detectEdge(mousePos: Electron.Point): ToolbarPosition | null {
    const display = screen.getDisplayNearestPoint(mousePos);
    const { x, y, width, height } = display.workArea;

    const distLeft = mousePos.x - x;
    const distRight = x + width - mousePos.x;
    const distTop = mousePos.y - y;
    const distBottom = y + height - mousePos.y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    if (minDist > SNAP_THRESHOLD) return null;

    if (minDist === distLeft) return "left";
    if (minDist === distRight) return "right";
    if (minDist === distTop) return "top";
    return "bottom";
  }

  show(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.show();
      return;
    }

    const position = this.store.getSettings().toolbarPosition;
    const bounds = this.getSnappedBounds(position);

    this.win = new BrowserWindow({
      ...bounds,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      minimizable: false,
      maximizable: false,
      focusable: true,
      webPreferences: {
        preload: this.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.docked = true;
    this.dockedBounds = bounds;

    this.loadUrl(this.win, `mode=toolbar&position=${position}`);

    this.win.on("moved", () => {
      if (!this.win || this.win.isDestroyed()) return;
      const bounds = this.win.getBounds();

      // If currently docked, check if user dragged far enough to detach
      if (this.docked && this.dockedBounds) {
        const dx = Math.abs(bounds.x - this.dockedBounds.x);
        const dy = Math.abs(bounds.y - this.dockedBounds.y);
        if (dx < DETACH_DISTANCE && dy < DETACH_DISTANCE) {
          // Still close to docked position, don't re-snap
          return;
        }
        // Detached!
        this.docked = false;
      }

      // Floating - detect nearest edge and snap using mouse position
      const mousePos = screen.getCursorScreenPoint();
      const edge = this.detectEdge(mousePos);
      if (edge) {
        const currentPosition = this.store.getSettings().toolbarPosition;
        if (edge !== currentPosition) {
          this.store.updateSettings({ toolbarPosition: edge });
          this.win.webContents.send(
            "settings:changed",
            this.store.getSettings(),
          );
        }
        this.snapToEdge(edge);
      }
    });

    this.win.on("closed", () => {
      this.win = null;
    });
  }

  hide(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
      this.win = null;
    }
  }

  getWindow(): BrowserWindow | null {
    return this.win;
  }

  destroy(): void {
    this.hide();
  }
}
