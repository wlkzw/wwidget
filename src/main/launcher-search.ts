import { shell, clipboard } from "electron";
import { exec } from "child_process";
import { readdir, stat } from "fs/promises";
import { join, basename, extname } from "path";
import type { LauncherResult } from "@shared/types";

// ---- System commands (always available) ----

const SYSTEM_COMMANDS: LauncherResult[] = [
  {
    id: "sys-lock",
    title: "Lock Screen",
    subtitle: "锁定屏幕",
    type: "system",
    icon: "🔒",
    action: "rundll32.exe user32.dll,LockWorkStation",
  },
  {
    id: "sys-sleep",
    title: "Sleep",
    subtitle: "休眠",
    type: "system",
    icon: "😴",
    action: "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
  },
  {
    id: "sys-shutdown",
    title: "Shutdown",
    subtitle: "关机",
    type: "system",
    icon: "⏻",
    action: "shutdown /s /t 0",
  },
  {
    id: "sys-restart",
    title: "Restart",
    subtitle: "重启",
    type: "system",
    icon: "🔄",
    action: "shutdown /r /t 0",
  },
  {
    id: "sys-settings",
    title: "Windows Settings",
    subtitle: "系统设置",
    type: "system",
    icon: "⚙️",
    action: "start ms-settings:",
  },
  {
    id: "sys-taskmgr",
    title: "Task Manager",
    subtitle: "任务管理器",
    type: "system",
    icon: "📊",
    action: "taskmgr.exe",
  },
  {
    id: "sys-explorer",
    title: "File Explorer",
    subtitle: "文件资源管理器",
    type: "system",
    icon: "📁",
    action: "explorer.exe",
  },
  {
    id: "sys-cmd",
    title: "Terminal",
    subtitle: "终端",
    type: "system",
    icon: "💻",
    action: "wt.exe",
  },
  {
    id: "sys-control",
    title: "Control Panel",
    subtitle: "控制面板",
    type: "system",
    icon: "🎛️",
    action: "control.exe",
  },
  {
    id: "sys-recycle",
    title: "Recycle Bin",
    subtitle: "回收站",
    type: "system",
    icon: "🗑️",
    action: "start shell:RecycleBinFolder",
  },
];

// ---- App index (scan Start Menu shortcuts) ----

interface AppEntry {
  name: string;
  nameLower: string;
  path: string;
}

let appIndex: AppEntry[] = [];
let appIndexReady = false;

async function scanDir(dir: string, results: AppEntry[]): Promise<void> {
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      try {
        const s = await stat(full);
        if (s.isDirectory()) {
          await scanDir(full, results);
        } else if (extname(full).toLowerCase() === ".lnk") {
          const name = basename(full, ".lnk");
          results.push({ name, nameLower: name.toLowerCase(), path: full });
        }
      } catch {
        // skip inaccessible files
      }
    }
  } catch {
    // skip inaccessible dirs
  }
}

export async function buildAppIndex(): Promise<void> {
  const dirs = [
    join(
      process.env.APPDATA || "",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
    ),
    join(
      process.env.PROGRAMDATA || "C:\\ProgramData",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
    ),
  ];

  const results: AppEntry[] = [];
  for (const d of dirs) {
    await scanDir(d, results);
  }
  // Dedupe by lowercase name
  const seen = new Set<string>();
  appIndex = results.filter((a) => {
    if (seen.has(a.nameLower)) return false;
    seen.add(a.nameLower);
    return true;
  });
  appIndex.sort((a, b) => a.name.localeCompare(b.name));
  appIndexReady = true;
}

// ---- Calculator ----

function tryCalc(query: string): LauncherResult | null {
  // Only evaluate if it looks like a math expression
  if (!/^[\d\s+\-*/().,%^]+$/.test(query)) return null;
  if (!/\d/.test(query)) return null;
  try {
    // Replace ^ with ** for exponentiation, % with /100
    const expr = query.replace(/\^/g, "**").replace(/%/g, "/100");
    // Safe eval using Function constructor (no access to scope)
    const result = new Function(`"use strict"; return (${expr})`)();
    if (typeof result !== "number" || !isFinite(result)) return null;
    const formatted =
      result % 1 === 0
        ? result.toString()
        : result.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return {
      id: "calc",
      title: `= ${formatted}`,
      subtitle: `${query}`,
      type: "calc",
      icon: "🧮",
      action: formatted,
    };
  } catch {
    return null;
  }
}

// ---- Main search function ----

export function search(query: string): LauncherResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: LauncherResult[] = [];
  const qLower = q.toLowerCase();

  // 1. Calculator
  const calc = tryCalc(q);
  if (calc) results.push(calc);

  // 2. System commands
  for (const cmd of SYSTEM_COMMANDS) {
    if (
      cmd.title.toLowerCase().includes(qLower) ||
      cmd.subtitle.includes(qLower)
    ) {
      results.push(cmd);
    }
  }

  // 3. Installed apps
  if (appIndexReady) {
    let appCount = 0;
    for (const app of appIndex) {
      if (appCount >= 5) break;
      if (app.nameLower.includes(qLower)) {
        results.push({
          id: `app-${app.nameLower}`,
          title: app.name,
          subtitle: app.path,
          type: "app",
          icon: "🪟",
          action: app.path,
        });
        appCount++;
      }
    }
  }

  // 4. Web search (always as last option)
  results.push({
    id: "web",
    title: `Search "${q}"`,
    subtitle: "在浏览器中搜索",
    type: "web",
    icon: "🔍",
    action: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  });

  return results;
}

// ---- Execute a result ----

export function executeResult(result: LauncherResult): void {
  switch (result.type) {
    case "app":
      shell.openPath(result.action);
      break;
    case "system":
      exec(result.action, { windowsHide: true });
      break;
    case "calc":
      // Copy result to clipboard
      clipboard.writeText(result.action);
      break;
    case "web":
      shell.openExternal(result.action);
      break;
    case "file":
      shell.openPath(result.action);
      break;
  }
}
