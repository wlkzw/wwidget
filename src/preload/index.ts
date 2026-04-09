import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "@shared/types";
import type { ElectronAPI } from "@shared/types";

const api: ElectronAPI = {
  widgets: {
    getAll: () => ipcRenderer.invoke(IPC.WIDGET_GET_ALL),
    create: (type) => ipcRenderer.invoke(IPC.WIDGET_CREATE, type),
    delete: (id) => ipcRenderer.invoke(IPC.WIDGET_DELETE, id),
    updateData: (id, data) =>
      ipcRenderer.invoke(IPC.WIDGET_UPDATE_DATA, id, data),
    updatePosition: (id, pos) =>
      ipcRenderer.invoke(IPC.WIDGET_UPDATE_POSITION, id, pos),
    onChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        widgets: unknown,
      ): void => {
        callback(widgets as never);
      };
      ipcRenderer.on(IPC.STATE_WIDGETS_CHANGED, handler);
      return () =>
        ipcRenderer.removeListener(IPC.STATE_WIDGETS_CHANGED, handler);
    },
  },
  theme: {
    get: () => ipcRenderer.invoke(IPC.THEME_GET),
    set: (theme) => ipcRenderer.invoke(IPC.THEME_SET, theme),
    onChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        theme: unknown,
      ): void => {
        callback(theme as never);
      };
      ipcRenderer.on(IPC.STATE_THEME_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.STATE_THEME_CHANGED, handler);
    },
  },
  window: {
    minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
    resize: (dw, dh) => ipcRenderer.send(IPC.WINDOW_RESIZE, dw, dh),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (settings) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),
  },
  system: {
    getStats: () => ipcRenderer.invoke(IPC.SYSTEM_STATS_GET),
  },
  clipboard: {
    getHistory: () => ipcRenderer.invoke(IPC.CLIPBOARD_GET_HISTORY),
    pin: (id) => ipcRenderer.invoke(IPC.CLIPBOARD_PIN, id),
    delete: (id) => ipcRenderer.invoke(IPC.CLIPBOARD_DELETE, id),
    copy: (id) => ipcRenderer.invoke(IPC.CLIPBOARD_COPY, id),
    clear: () => ipcRenderer.invoke(IPC.CLIPBOARD_CLEAR),
    onChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        entries: unknown,
      ): void => {
        callback(entries as never);
      };
      ipcRenderer.on(IPC.CLIPBOARD_CHANGED, handler);
      return () =>
        ipcRenderer.removeListener(IPC.CLIPBOARD_CHANGED, handler);
    },
  },
  launcher: {
    search: (query) => ipcRenderer.invoke(IPC.LAUNCHER_SEARCH, query),
    execute: (result) => ipcRenderer.invoke(IPC.LAUNCHER_EXECUTE, result),
    hide: () => ipcRenderer.send(IPC.LAUNCHER_HIDE),
  },
  colorPicker: {
    startPicking: () => ipcRenderer.invoke(IPC.COLOR_PICK_START),
    onResult: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { hex: string; rgb: string },
      ): void => {
        callback(data.hex, data.rgb);
      };
      ipcRenderer.on(IPC.COLOR_PICK_RESULT, handler);
      return () =>
        ipcRenderer.removeListener(IPC.COLOR_PICK_RESULT, handler);
    },
    // For the overlay window
    onScreenshot: (callback: (dataUrl: string) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        dataUrl: string,
      ): void => {
        callback(dataUrl);
      };
      ipcRenderer.on("color:screenshot", handler);
      return () =>
        ipcRenderer.removeListener("color:screenshot", handler);
    },
    sendPicked: (hex: string, rgb: string) =>
      ipcRenderer.send("color:picked", hex, rgb),
    sendCancel: () => ipcRenderer.send("color:pick-cancel"),
  },
  toolbar: {
    addWidget: (type) => ipcRenderer.invoke(IPC.TOOLBAR_ADD_WIDGET, type),
    setPosition: (position) =>
      ipcRenderer.invoke(IPC.TOOLBAR_SET_POSITION, position),
    openLauncher: () => ipcRenderer.send(IPC.TOOLBAR_OPEN_LAUNCHER),
    getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    onSettingsChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        settings: unknown,
      ): void => {
        callback(settings as never);
      };
      ipcRenderer.on("settings:changed", handler);
      return () => ipcRenderer.removeListener("settings:changed", handler);
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
