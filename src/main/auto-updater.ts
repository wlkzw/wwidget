import { autoUpdater } from "electron-updater";
import { dialog, app } from "electron";

export function initAutoUpdater(): void {
  // 生产环境才启用，开发时跳过
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", () => {
    // 发现新版本，后台静默下载（autoDownload=true 时无需手动触发）
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "更新已就绪",
        message: "新版本已下载完毕，重启后自动安装。",
        buttons: ["立即重启", "稍后"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto updater error:", err);
  });

  // 启动后延迟 10 秒检查，避免影响启动速度
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Check for updates failed:", err);
    });
  }, 10_000);
}
