import { useState, useEffect } from "react";
import type { SystemStats } from "@shared/types";
import "./SystemMonitorWidget.css";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1);
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Ring({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}): React.JSX.Element {
  const r = 30;
  const stroke = 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="sysmon-ring-container">
      <svg
        width={r * 2 + stroke * 2}
        height={r * 2 + stroke * 2}
        className="sysmon-ring"
      >
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${r + stroke} ${r + stroke})`}
          className="sysmon-ring-progress"
        />
        <text
          x={r + stroke}
          y={r + stroke}
          textAnchor="middle"
          dominantBaseline="central"
          className="sysmon-ring-value"
          fill="var(--text-primary)"
        >
          {value}%
        </text>
      </svg>
      <span className="sysmon-ring-label">{label}</span>
    </div>
  );
}

export function SystemMonitorWidget(): React.JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const poll = (): void => {
      window.electronAPI.system.getStats().then(setStats);
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!stats) {
    return <div className="sysmon-loading">Loading...</div>;
  }

  return (
    <div className="sysmon">
      <div className="sysmon-rings">
        <Ring value={stats.cpuUsage} label="CPU" color="#34c759" />
        <Ring value={stats.memPercent} label="MEM" color="#007aff" />
      </div>
      <div className="sysmon-details">
        <div className="sysmon-detail">
          <span className="sysmon-detail-label">RAM</span>
          <span className="sysmon-detail-value">
            {formatBytes(stats.memUsed)} / {formatBytes(stats.memTotal)} GB
          </span>
        </div>
        <div className="sysmon-detail">
          <span className="sysmon-detail-label">Uptime</span>
          <span className="sysmon-detail-value">
            {formatUptime(stats.uptime)}
          </span>
        </div>
      </div>
    </div>
  );
}
