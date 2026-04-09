import * as os from "os";
import type { SystemStats } from "@shared/types";

let prevIdle = 0;
let prevTotal = 0;

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.irq +
      cpu.times.idle;
  }

  const diffIdle = idle - prevIdle;
  const diffTotal = total - prevTotal;
  prevIdle = idle;
  prevTotal = total;

  if (diffTotal === 0) return 0;
  return Math.round((1 - diffIdle / diffTotal) * 100);
}

export function getSystemStats(): SystemStats {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpuUsage: getCpuUsage(),
    memTotal: totalMem,
    memUsed: usedMem,
    memPercent: Math.round((usedMem / totalMem) * 100),
    uptime: os.uptime(),
  };
}
