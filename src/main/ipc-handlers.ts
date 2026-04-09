import { ipcMain, BrowserWindow } from "electron";
import { IPC } from "@shared/types";
import type {
  WidgetType,
  WidgetData,
  PositionUpdate,
  Theme,
  Settings,
} from "@shared/types";
import { Store } from "./store";
import { WindowManager } from "./window-manager";
import { createWidgetInstance } from "./widget-registry";
import { getSystemStats } from "./system-stats";
import { ClipboardMonitor } from "./clipboard-monitor";

export function registerIpcHandlers(
  store: Store,
  windowManager: WindowManager,
): ClipboardMonitor {
  const clipboardMonitor = new ClipboardMonitor();
  clipboardMonitor.start(store, (entries) => {
    windowManager.broadcast(IPC.CLIPBOARD_CHANGED, entries);
  });
  // Widget handlers
  ipcMain.handle(IPC.WIDGET_GET_ALL, () => {
    return store.getWidgets();
  });

  ipcMain.handle(IPC.WIDGET_CREATE, (_event, type: WidgetType) => {
    const widget = createWidgetInstance(type);
    store.addWidget(widget);
    windowManager.addWidget(widget);
    return widget;
  });

  ipcMain.handle(IPC.WIDGET_DELETE, (_event, id: string) => {
    store.removeWidget(id);
    windowManager.removeWidgetWindow(id);
  });

  ipcMain.handle(
    IPC.WIDGET_UPDATE_DATA,
    (_event, id: string, data: WidgetData) => {
      store.updateWidgetData(id, data);
      windowManager.broadcast(IPC.STATE_WIDGETS_CHANGED, store.getWidgets());
    },
  );

  ipcMain.handle(
    IPC.WIDGET_UPDATE_POSITION,
    (_event, id: string, pos: PositionUpdate) => {
      store.updateWidgetPosition(id, pos);
    },
  );

  // Theme handlers
  ipcMain.handle(IPC.THEME_GET, () => {
    return store.getState().theme;
  });

  ipcMain.handle(IPC.THEME_SET, (_event, theme: Theme) => {
    store.setTheme(theme);
    windowManager.broadcast(IPC.STATE_THEME_CHANGED, theme);
  });

  // Settings handlers
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return store.getSettings();
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_event, settings: Partial<Settings>) => {
    store.updateSettings(settings);
    if (settings.alwaysOnTop !== undefined) {
      windowManager.setAlwaysOnTop(settings.alwaysOnTop);
    }
  });

  // Window control handlers
  ipcMain.on(IPC.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  // System stats handler
  ipcMain.handle(IPC.SYSTEM_STATS_GET, () => {
    return getSystemStats();
  });

  // Clipboard handlers
  ipcMain.handle(IPC.CLIPBOARD_GET_HISTORY, () => {
    return clipboardMonitor.getHistory();
  });

  ipcMain.handle(IPC.CLIPBOARD_PIN, (_event, id: string) => {
    clipboardMonitor.pin(id);
  });

  ipcMain.handle(IPC.CLIPBOARD_DELETE, (_event, id: string) => {
    clipboardMonitor.delete(id);
  });

  ipcMain.handle(IPC.CLIPBOARD_COPY, (_event, id: string) => {
    clipboardMonitor.copy(id);
  });

  ipcMain.handle(IPC.CLIPBOARD_CLEAR, () => {
    clipboardMonitor.clear();
  });

  ipcMain.on(IPC.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  return clipboardMonitor;
}
