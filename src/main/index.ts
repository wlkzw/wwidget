import { app, BrowserWindow } from "electron";
import { Store } from "./store";
import { WindowManager } from "./window-manager";
import { TrayManager } from "./tray-manager";
import { ToolbarManager } from "./toolbar-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { LauncherManager } from "./launcher-manager";
import { ColorPickerService } from "./color-picker";
import type { ClipboardMonitor } from "./clipboard-monitor";
import { initAutoUpdater } from "./auto-updater";

let store: Store;
let windowManager: WindowManager;
let trayManager: TrayManager;
let toolbarManager: ToolbarManager;
let launcherManager: LauncherManager;
let colorPickerService: ColorPickerService;
let clipboardMonitor: ClipboardMonitor;

function bootstrap(): void {
  store = new Store();
  windowManager = new WindowManager(store);
  trayManager = new TrayManager(store, windowManager);

  clipboardMonitor = registerIpcHandlers(store, windowManager);
  trayManager.create();

  launcherManager = new LauncherManager();
  launcherManager.init();
  trayManager.setLauncherManager(launcherManager);

  toolbarManager = new ToolbarManager(store, windowManager);
  toolbarManager.setLauncherManager(launcherManager);
  toolbarManager.init();

  colorPickerService = new ColorPickerService(windowManager);
  colorPickerService.init();

  // Launch saved widgets
  const state = store.getState();
  for (const widget of state.widgets) {
    windowManager.createWidgetWindow(widget);
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.wwidget.app");

  bootstrap();
  initAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      bootstrap();
    }
  });
});

// Don't quit when all windows are closed - we live in the tray
app.on("window-all-closed", () => {
  // On macOS this is normal, on Windows we stay in tray
  // Only quit from tray menu
});

app.on("before-quit", () => {
  if (clipboardMonitor) clipboardMonitor.stop();
  if (toolbarManager) toolbarManager.destroy();
  if (launcherManager) launcherManager.destroy();
  if (store) store.flush();
});

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    windowManager?.showAll();
  });
}
