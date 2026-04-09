import { BrowserWindow, desktopCapturer, screen, ipcMain, app } from "electron";
import { join } from "path";
import { IPC } from "@shared/types";
import { WindowManager } from "./window-manager";

export class ColorPickerService {
  private overlay: BrowserWindow | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  init(): void {
    ipcMain.handle(IPC.COLOR_PICK_START, async () => {
      await this.startPicking();
    });

    // Receive picked color from overlay
    ipcMain.on("color:picked", (_event, hex: string, rgb: string) => {
      this.closeOverlay();
      // Broadcast result to all widget windows
      this.windowManager.broadcast(IPC.COLOR_PICK_RESULT, { hex, rgb });
    });

    ipcMain.on("color:pick-cancel", () => {
      this.closeOverlay();
    });
  }

  private async startPicking(): Promise<void> {
    if (this.overlay && !this.overlay.isDestroyed()) {
      this.overlay.close();
    }

    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const { width, height } = display.size;
    const scaleFactor = display.scaleFactor;

    // Capture the screen
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
      },
    });

    if (sources.length === 0) return;

    // Find the source for the current display
    const source = sources[0];
    const screenshotDataUrl = source.thumbnail.toDataURL();

    // Create fullscreen overlay
    this.overlay = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: width,
      height: height,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Load picker overlay UI
    if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
      this.overlay.loadURL(
        `${process.env["ELECTRON_RENDERER_URL"]}?mode=color-picker`,
      );
    } else {
      this.overlay.loadFile(join(__dirname, "../renderer/index.html"), {
        search: "mode=color-picker",
      });
    }

    this.overlay.once("ready-to-show", () => {
      this.overlay?.show();
    });

    // Send screenshot data after page loads
    this.overlay.webContents.once("did-finish-load", () => {
      this.overlay?.webContents.send("color:screenshot", screenshotDataUrl);
    });

    this.overlay.on("closed", () => {
      this.overlay = null;
    });
  }

  private closeOverlay(): void {
    if (this.overlay && !this.overlay.isDestroyed()) {
      this.overlay.close();
      this.overlay = null;
    }
  }
}
