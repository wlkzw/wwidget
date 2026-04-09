import { useState, useEffect, memo } from "react";
import type { ClipboardEntry } from "@shared/types";
import "./ClipboardWidget.css";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const EntryItem = memo(function EntryItem({
  entry,
  onCopy,
  onPin,
  onDelete,
}: {
  entry: ClipboardEntry;
  onCopy: () => void;
  onPin: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const preview =
    entry.content.length > 120
      ? entry.content.slice(0, 120) + "..."
      : entry.content;
  const lines = preview.split("\n").slice(0, 3);
  const displayText =
    lines.join("\n") + (entry.content.split("\n").length > 3 ? "..." : "");

  return (
    <div className={`cb-entry ${entry.pinned ? "cb-entry--pinned" : ""}`}>
      <div className="cb-entry-content" onClick={onCopy} title="Click to copy">
        <pre className="cb-entry-text">{displayText}</pre>
      </div>
      <div className="cb-entry-meta">
        <span className="cb-entry-source" title={entry.source}>
          {entry.source}
        </span>
        <span className="cb-entry-time">{timeAgo(entry.timestamp)}</span>
      </div>
      <div className="cb-entry-actions">
        <button
          className={`cb-btn cb-btn-pin ${entry.pinned ? "cb-btn-pin--active" : ""}`}
          onClick={onPin}
          title={entry.pinned ? "Unpin" : "Pin"}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1-.707.708l-.159-.16-1.768 2.475a3 3 0 0 1-.14.167l-.478.478L8.414 12.5l.354.354a.5.5 0 1 1-.707.707l-1.414-1.414-3.536 3.536a.5.5 0 0 1-.707-.707l3.536-3.536L4.526 10.03a.5.5 0 1 1 .707-.707l.354.354 2.993-2.993-.478-.478a3 3 0 0 1 .167-.14L10.78 4.3l-.16-.16a.5.5 0 0 1 .208-.855z" />
          </svg>
        </button>
        <button
          className="cb-btn cb-btn-delete"
          onClick={onDelete}
          title="Delete"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export function ClipboardWidget(): React.JSX.Element {
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.electronAPI.clipboard.getHistory().then(setEntries);
    const unsub = window.electronAPI.clipboard.onChanged(setEntries);
    return unsub;
  }, []);

  // Refresh relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const filtered = search
    ? entries.filter(
        (e) =>
          e.content.toLowerCase().includes(search.toLowerCase()) ||
          e.source.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  return (
    <div className="cb-widget">
      <div className="cb-toolbar">
        <input
          className="cb-search"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {entries.length > 0 && (
          <button
            className="cb-btn cb-btn-clear"
            onClick={() => window.electronAPI.clipboard.clear()}
            title="Clear unpinned"
          >
            Clear
          </button>
        )}
      </div>
      <div className="cb-list">
        {filtered.length === 0 ? (
          <div className="cb-empty">
            {search ? "No matches" : "Clipboard history will appear here"}
          </div>
        ) : (
          filtered.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              onCopy={() => window.electronAPI.clipboard.copy(entry.id)}
              onPin={() => window.electronAPI.clipboard.pin(entry.id)}
              onDelete={() => window.electronAPI.clipboard.delete(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
