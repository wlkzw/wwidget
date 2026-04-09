import { useState, useEffect, useRef, useCallback } from "react";
import type { LauncherResult } from "@shared/types";
import "./Launcher.css";

const TYPE_LABELS: Record<string, string> = {
  app: "应用",
  system: "系统",
  calc: "计算",
  web: "搜索",
  file: "文件",
};

export function Launcher(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LauncherResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on show
  useEffect(() => {
    inputRef.current?.focus();

    const handler = (): void => {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    // Listen for refocus when window is re-shown
    window.addEventListener("focus", handler);

    return () => {
      window.removeEventListener("focus", handler);
    };
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await window.electronAPI.launcher.search(query);
      setResults(res);
      setSelectedIndex(0);
    }, 80);

    return () => clearTimeout(timer);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const execute = useCallback((result: LauncherResult) => {
    window.electronAPI.launcher.execute(result);
    setQuery("");
    setResults([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            execute(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          window.electronAPI.launcher.hide();
          break;
      }
    },
    [results, selectedIndex, execute],
  );

  return (
    <div className="launcher">
      <div className="launcher__search-bar">
        <span className="launcher__search-icon">🔍</span>
        <input
          ref={inputRef}
          className="launcher__input"
          type="text"
          placeholder="搜索应用、执行命令、计算..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoFocus
        />
        {query && (
          <button
            className="launcher__clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="launcher__results" ref={listRef}>
          {results.map((result, index) => (
            <div
              key={result.id}
              className={`launcher__item ${index === selectedIndex ? "launcher__item--selected" : ""}`}
              onClick={() => execute(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="launcher__item-icon">{result.icon}</span>
              <div className="launcher__item-text">
                <div className="launcher__item-title">{result.title}</div>
                <div className="launcher__item-subtitle">{result.subtitle}</div>
              </div>
              <span className="launcher__item-type">
                {TYPE_LABELS[result.type] || result.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="launcher__empty">无结果</div>
      )}

      <div className="launcher__footer">
        <span>↑↓ 导航</span>
        <span>Enter 执行</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  );
}
