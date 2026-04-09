import { BrowserWindow, globalShortcut, screen, app, ipcMain } from "electron";
import { join } from "path";
import { IPC } from "@shared/types";
import type { LauncherResult } from "@shared/types";
import { search, executeResult, buildAppIndex } from "./launcher-search";

export class LauncherManager {
  private win: BrowserWindow | null = null;

  init(): void {
    // Build app index in background
    buildAppIndex();

    // Register global shortcut
    globalShortcut.register("Alt+Space", () => {
      this.toggle();
    });

    // Register IPC handlers
    ipcMain.handle(IPC.LAUNCHER_SEARCH, (_event, query: string) => {
      return search(query);
    });

    ipcMain.handle(IPC.LAUNCHER_EXECUTE, (_event, result: LauncherResult) => {
      executeResult(result);
      this.hide();
    });

    ipcMain.on(IPC.LAUNCHER_HIDE, () => {
      this.hide();
    });
  }

  private toggle(): void {
    if (this.win && !this.win.isDestroyed()) {
      if (this.win.isVisible()) {
        this.hide();
      } else {
        this.show();
      }
    } else {
      this.createWindow();
    }
  }

  private createWindow(): void {
    const display = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint(),
    );
    const { width: dw, height: dh } = display.workAreaSize;
    const winWidth = 620;
    const winHeight = 460;

    this.win = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: display.workArea.x + Math.round((dw - winWidth) / 2),
      y: display.workArea.y + Math.round(dh * 0.25),
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    const loadUrl = (): void => {
      if (!this.win) return;
      if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
        this.win.loadURL(
          `${process.env["ELECTRON_RENDERER_URL"]}?mode=launcher`,
        );
      } else {
        this.win.loadFile(join(__dirname, "../renderer/index.html"), {
          search: "mode=launcher",
        });
      }
    };

    loadUrl();

    this.win.once("ready-to-show", () => {
      this.win?.show();
      this.win?.focus();
    });

    this.win.on("blur", () => {
      this.hide();
    });

    this.win.on("closed", () => {
      this.win = null;
    });
  }

  show(): void {
    if (!this.win || this.win.isDestroyed()) {
      this.createWindow();
      return;
    }

    // Re-center on current cursor's display
    const display = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint(),
    );
    const { width: dw, height: dh } = display.workAreaSize;
    const winWidth = 620;
    this.win.setPosition(
      display.workArea.x + Math.round((dw - winWidth) / 2),
      display.workArea.y + Math.round(dh * 0.25),
    );

    this.win.show();
    this.win.focus();
    // Tell renderer to clear the search
    this.win.webContents.send("launcher:show");
  }

  private hide(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.hide();
    }
  }

  destroy(): void {
    globalShortcut.unregister("Alt+Space");
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
    }
  }
}
