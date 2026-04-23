import { Tray, Menu, app, nativeImage, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import type { MenuItemConstructorOptions } from "electron";
import { join } from "path";
import { Store } from "./store";
import { WindowManager } from "./window-manager";
import { LauncherManager } from "./launcher-manager";
import { createWidgetInstance } from "./widget-registry";

export class TrayManager {
  private tray: Tray | null = null;
  private store: Store;
  private windowManager: WindowManager;
  private launcherManager: LauncherManager | null = null;

  constructor(store: Store, windowManager: WindowManager) {
    this.store = store;
    this.windowManager = windowManager;
  }

  setLauncherManager(lm: LauncherManager): void {
    this.launcherManager = lm;
  }

  create(): void {
    const iconPath = join(__dirname, "../../resources/icon.ico");
    let icon: Electron.NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) throw new Error("empty");
    } catch {
      icon = nativeImage.createFromBuffer(Buffer.from(createFallbackIcon()), {
        width: 16,
        height: 16,
      });
    }

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip("WWidget");
    this.updateMenu();

    this.tray.on("click", () => {
      this.windowManager.showAll();
    });
  }

  updateMenu(): void {
    if (!this.tray) return;

    const state = this.store.getState();
    const template: MenuItemConstructorOptions[] = [
      { label: "WWidget", enabled: false },
      { type: "separator" },
      {
        label: "Quick Launcher",
        accelerator: "Alt+Space",
        click: (): void => {
          this.launcherManager?.show();
        },
      },
      { type: "separator" },
      {
        label: "Add Widget",
        submenu: [
          {
            label: "Memo",
            click: (): void => {
              const widget = createWidgetInstance("memo");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
          {
            label: "Timer",
            click: (): void => {
              const widget = createWidgetInstance("timer");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
          {
            label: "Weather",
            click: (): void => {
              const widget = createWidgetInstance("weather");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
          {
            label: "System Monitor",
            click: (): void => {
              const widget = createWidgetInstance("system-monitor");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
          {
            label: "Clipboard History",
            click: (): void => {
              const widget = createWidgetInstance("clipboard-history");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
          {
            label: "Color Picker",
            click: (): void => {
              const widget = createWidgetInstance("color-picker");
              this.store.addWidget(widget);
              this.windowManager.addWidget(widget);
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: "Theme",
        submenu: [
          {
            label: "Light",
            type: "radio",
            checked: state.theme === "light",
            click: (): void => {
              this.store.setTheme("light");
              this.windowManager.broadcast("state:theme-changed", "light");
              this.updateMenu();
            },
          },
          {
            label: "Dark",
            type: "radio",
            checked: state.theme === "dark",
            click: (): void => {
              this.store.setTheme("dark");
              this.windowManager.broadcast("state:theme-changed", "dark");
              this.updateMenu();
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: "Always on Top",
        type: "checkbox",
        checked: state.settings.alwaysOnTop,
        click: (item): void => {
          this.store.updateSettings({ alwaysOnTop: item.checked });
          this.windowManager.setAlwaysOnTop(item.checked);
        },
      },
      {
        label: "Show Toolbar",
        type: "checkbox",
        checked: state.settings.toolbarVisible,
        click: (): void => {
          ipcMain.emit("toolbar:toggle");
          setTimeout(() => this.updateMenu(), 100);
        },
      },
      {
        label: "Set Weather API Key...",
        click: (): void => {
          this.showApiKeyPrompt();
        },
      },
      { type: "separator" },
      {
        label: "检查更新",
        enabled: app.isPackaged,
        click: (): void => {
          autoUpdater.checkForUpdates().catch(() => {});
        },
      },
      {
        label: "Quit",
        click: (): void => {
          this.store.flush();
          app.quit();
        },
      },
    ];

    this.tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  private showApiKeyPrompt(): void {
    const current = this.store.getSettings().weatherApiKey;

    const win = new BrowserWindow({
      width: 420,
      height: 200,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      frame: true,
      title: "Weather API Key",
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui; padding: 20px; margin: 0; background: #f5f5f5; }
  h3 { margin: 0 0 12px; font-size: 14px; }
  input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; }
  .btns { margin-top: 16px; text-align: right; }
  button { padding: 6px 18px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-left: 8px; }
  .save { background: #007aff; color: white; }
  .cancel { background: #e0e0e0; }
  p { font-size: 12px; color: #888; margin: 6px 0 0; }
</style></head><body>
  <h3>OpenWeatherMap API Key</h3>
  <input id="k" placeholder="输入 API Key" value="${current}"/>
  <p>免费注册: openweathermap.org/api</p>
  <div class="btns">
    <button class="cancel" onclick="window.close()">取消</button>
    <button class="save" id="saveBtn">保存</button>
  </div>
  <script>
    document.getElementById('saveBtn').onclick = () => {
      const v = document.getElementById('k').value.trim();
      document.title = 'APIKEY:' + v;
      window.close();
    };
    document.getElementById('k').addEventListener('keydown', e => {
      if(e.key==='Enter') document.getElementById('saveBtn').click();
    });
  </script>
</body></html>`;

    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    win.setMenu(null);

    win.on("page-title-updated", (_e, title) => {
      if (title.startsWith("APIKEY:")) {
        const key = title.slice(7);
        if (key) {
          this.store.updateSettings({ weatherApiKey: key });
        }
      }
    });
  }
}

function createFallbackIcon(): Uint8Array {
  const size = 16 * 16 * 4;
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i += 4) {
    buf[i] = 100;
    buf[i + 1] = 149;
    buf[i + 2] = 237;
    buf[i + 3] = 255;
  }
  return buf;
}
