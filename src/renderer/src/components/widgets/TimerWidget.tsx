import { useState, useEffect, useRef, useCallback } from "react";
import type { TimerData } from "@shared/types";
import "./TimerWidget.css";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function TimerWidget({
  widgetId,
  data,
}: {
  widgetId: string;
  data: TimerData;
}): React.JSX.Element {
  const [mode, setMode] = useState<"stopwatch" | "countdown">(data.mode);
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0); // seconds, used for countdown
  const [centis, setCentis] = useState(0);   // centiseconds (1/100s), used for stopwatch
  const [countdownTotal, setCountdownTotal] = useState(data.countdownSeconds);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback((): void => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Auto-stop countdown when it reaches 0
  useEffect(() => {
    if (
      mode === "countdown" &&
      status === "running" &&
      elapsed >= countdownTotal
    ) {
      stop();
      setStatus("idle");
      setElapsed(countdownTotal);
    }
  }, [elapsed, mode, status, countdownTotal, stop]);

  const handleStartPause = (): void => {
    if (status === "running") {
      stop();
      setStatus("paused");
    } else {
      if (mode === "countdown" && elapsed >= countdownTotal) {
        setElapsed(0);
      }
      if (mode === "stopwatch") {
        tickRef.current = setInterval(() => setCentis((c) => c + 1), 10);
      } else {
        tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      }
      setStatus("running");
    }
  };

  const handleReset = (): void => {
    stop();
    setElapsed(0);
    setCentis(0);
    setStatus("idle");
  };

  const switchMode = (newMode: "stopwatch" | "countdown"): void => {
    stop();
    setMode(newMode);
    setElapsed(0);
    setCentis(0);
    setStatus("idle");
    window.electronAPI.widgets.updateData(widgetId, {
      mode: newMode,
      countdownSeconds: countdownTotal,
    } as TimerData);
  };

  const updateDuration = (totalSecs: number): void => {
    const secs = Math.max(1, totalSecs);
    setCountdownTotal(secs);
    window.electronAPI.widgets.updateData(widgetId, {
      mode,
      countdownSeconds: secs,
    } as TimerData);
  };

  const displaySecs =
    mode === "countdown" ? Math.max(0, countdownTotal - elapsed) : 0;

  const isDone =
    mode === "countdown" &&
    status === "idle" &&
    elapsed > 0 &&
    displaySecs === 0;

  const showSetInput = mode === "countdown" && status === "idle" && !isDone;

  // Countdown display parts
  const cdH = Math.floor(displaySecs / 3600);
  const cdM = Math.floor((displaySecs % 3600) / 60);
  const cdS = displaySecs % 60;

  // Stopwatch display parts
  const swTotalSec = Math.floor(centis / 100);
  const swH = Math.floor(swTotalSec / 3600);
  const swM = Math.floor((swTotalSec % 3600) / 60);
  const swS = swTotalSec % 60;
  const swCs = centis % 100;

  return (
    <div className="timer-widget">
      <div className="timer-widget__tabs">
        <button
          className={`timer-widget__tab${mode === "stopwatch" ? " timer-widget__tab--active" : ""}`}
          onClick={() => switchMode("stopwatch")}
        >
          秒表
        </button>
        <button
          className={`timer-widget__tab${mode === "countdown" ? " timer-widget__tab--active" : ""}`}
          onClick={() => switchMode("countdown")}
        >
          倒计时
        </button>
      </div>

      {showSetInput ? (
        <div className="timer-widget__set">
          <input
            type="number"
            className="timer-widget__set-input"
            min={0}
            max={99}
            value={Math.floor(countdownTotal / 60)}
            onChange={(e) => {
              const mins = Math.max(0, Number(e.target.value) || 0);
              updateDuration(mins * 60 + (countdownTotal % 60));
            }}
          />
          <span className="timer-widget__set-label">分</span>
          <input
            type="number"
            className="timer-widget__set-input"
            min={0}
            max={59}
            value={countdownTotal % 60}
            onChange={(e) => {
              const secs = Math.min(59, Math.max(0, Number(e.target.value) || 0));
              updateDuration(Math.floor(countdownTotal / 60) * 60 + secs);
            }}
          />
          <span className="timer-widget__set-label">秒</span>
        </div>
      ) : mode === "stopwatch" ? (
        <div className="timer-widget__display">
          <span>
            {swH > 0
              ? `${swH}:${pad(swM)}:${pad(swS)}`
              : `${pad(swM)}:${pad(swS)}`}
          </span>
          <span className="timer-widget__cs">.{pad(swCs)}</span>
        </div>
      ) : (
        <div
          className={`timer-widget__display${isDone ? " timer-widget__display--done" : ""}`}
        >
          {cdH > 0
            ? `${cdH}:${pad(cdM)}:${pad(cdS)}`
            : `${pad(cdM)}:${pad(cdS)}`}
        </div>
      )}

      <div className="timer-widget__controls">
        <button
          className="timer-widget__btn timer-widget__btn--primary"
          onClick={handleStartPause}
          title={status === "running" ? "暂停" : "开始"}
        >
          {status === "running" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <button
          className="timer-widget__btn"
          onClick={handleReset}
          title="重置"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 .49-3" />
            <polyline points="1 4 3 9 8 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
