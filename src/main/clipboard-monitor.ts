import { clipboard } from "electron";
import { spawn, type ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import type { ClipboardEntry } from "@shared/types";
import type { Store } from "./store";

const MAX_ENTRIES = 50;

/**
 * Persistent PowerShell process for getting the foreground window's app name.
 * Compiles the C# P/Invoke code once on startup, then reuses it for every query.
 */
class ForegroundAppDetector {
  private ps: ChildProcess | null = null;
  private ready = false;
  private pending: ((name: string) => void) | null = null;
  private buffer = "";

  start(): void {
    this.ps = spawn("powershell", ["-NoProfile", "-NoLogo", "-Command", "-"], {
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });

    this.ps.stdout?.setEncoding("utf8");
    this.ps.stdout?.on("data", (chunk: string) => {
      this.buffer += chunk;
      // Look for our sentinel marker
      const idx = this.buffer.indexOf("##END##");
      if (idx !== -1) {
        const result = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 7);
        if (this.pending) {
          this.pending(result);
          this.pending = null;
        }
      }
    });

    this.ps.on("exit", () => {
      this.ps = null;
      this.ready = false;
    });

    // Compile C# code once
    const initScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class FGW {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public static string Get() {
    IntPtr h = GetForegroundWindow(); uint pid;
    GetWindowThreadProcessId(h, out pid);
    try { return Process.GetProcessById((int)pid).ProcessName; }
    catch { return ""; }
  }
}
'@
Write-Output "##END##"
`;
    this.ps.stdin?.write(initScript + "\n");
    // Wait for compilation to finish
    const origPending = this.pending;
    this.pending = () => {
      this.ready = true;
      this.pending = origPending;
    };
  }

  query(): Promise<string> {
    if (!this.ps || !this.ready) return Promise.resolve("");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending = null;
        resolve("");
      }, 1000);

      this.pending = (name: string) => {
        clearTimeout(timeout);
        resolve(name);
      };

      this.ps!.stdin?.write('[FGW]::Get(); Write-Output "##END##"\n');
    });
  }

  stop(): void {
    if (this.ps) {
      this.ps.stdin?.end();
      this.ps.kill();
      this.ps = null;
    }
  }
}

export class ClipboardMonitor {
  private entries: ClipboardEntry[] = [];
  private lastText = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private onChange: ((entries: ClipboardEntry[]) => void) | null = null;
  private store: Store | null = null;
  private detector = new ForegroundAppDetector();
  private skipNext = false;

  start(store: Store, onChange: (entries: ClipboardEntry[]) => void): void {
    this.store = store;
    this.onChange = onChange;
    this.lastText = clipboard.readText() || "";

    // Restore pinned entries from persistent storage
    const pinned = store.getPinnedClipboard();
    if (pinned.length > 0) {
      this.entries = pinned.map((e) => ({ ...e, pinned: true }));
    }

    this.detector.start();

    this.timer = setInterval(() => {
      this.poll();
    }, 500);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.detector.stop();
  }

  private async poll(): Promise<void> {
    const text = clipboard.readText();
    if (!text || text === this.lastText) return;

    this.lastText = text;

    // Don't record if it was copied from ourselves (via the copy button)
    if (this.skipNext) {
      this.skipNext = false;
      return;
    }

    const source = await this.detector.query();

    const entry: ClipboardEntry = {
      id: randomUUID(),
      content: text,
      source: source || "Unknown",
      timestamp: Date.now(),
      pinned: false,
    };

    // Avoid duplicates - if same content exists, move it to top
    this.entries = this.entries.filter((e) => e.content !== text);
    this.entries.unshift(entry);

    // Trim to max, but keep pinned
    if (this.entries.length > MAX_ENTRIES) {
      const pinned = this.entries.filter((e) => e.pinned);
      const unpinned = this.entries.filter((e) => !e.pinned);
      this.entries = [
        ...pinned,
        ...unpinned.slice(0, MAX_ENTRIES - pinned.length),
      ];
    }

    this.onChange?.(this.getSorted());
  }

  getHistory(): ClipboardEntry[] {
    return this.getSorted();
  }

  private getSorted(): ClipboardEntry[] {
    const pinned = this.entries.filter((e) => e.pinned);
    const unpinned = this.entries.filter((e) => !e.pinned);
    return [...pinned, ...unpinned];
  }

  pin(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.pinned = !entry.pinned;
      this.persistPinned();
      this.onChange?.(this.getSorted());
    }
  }

  delete(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.persistPinned();
    this.onChange?.(this.getSorted());
  }

  copy(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      this.skipNext = true;
      this.lastText = entry.content;
      clipboard.writeText(entry.content);
    }
  }

  clear(): void {
    const pinned = this.entries.filter((e) => e.pinned);
    this.entries = pinned;
    this.onChange?.(this.getSorted());
  }

  private persistPinned(): void {
    const pinned = this.entries.filter((e) => e.pinned);
    this.store?.savePinnedClipboard(pinned);
  }
}
