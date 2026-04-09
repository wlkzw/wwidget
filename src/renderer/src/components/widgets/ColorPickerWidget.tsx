import { useState, useEffect, useCallback } from "react";
import type { ColorPickerData, ColorEntry } from "@shared/types";
import "./ColorPickerWidget.css";

interface Props {
  widgetId: string;
  data: ColorPickerData;
}

function hexToRgb(hex: string): [number, number, number] {
  const val = parseInt(hex.slice(1), 16);
  return [(val >> 16) & 255, (val >> 8) & 255, val & 255];
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function ColorPickerWidget({
  widgetId,
  data,
}: Props): React.JSX.Element {
  const [colors, setColors] = useState<ColorEntry[]>(data.colors || []);
  const [copied, setCopied] = useState("");

  const currentColor = colors.length > 0 ? colors[0] : null;

  // Listen for picked colors
  useEffect(() => {
    const unsub = window.electronAPI.colorPicker.onResult((hex, rgb) => {
      const entry: ColorEntry = { hex, rgb, timestamp: Date.now() };
      setColors((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        window.electronAPI.widgets.updateData(widgetId, { colors: next });
        return next;
      });
    });
    return unsub;
  }, [widgetId]);

  const startPicking = useCallback(() => {
    window.electronAPI.colorPicker.startPicking();
  }, []);

  const copyValue = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(""), 1500);
  }, []);

  const removeColor = useCallback(
    (timestamp: number) => {
      setColors((prev) => {
        const next = prev.filter((c) => c.timestamp !== timestamp);
        window.electronAPI.widgets.updateData(widgetId, { colors: next });
        return next;
      });
    },
    [widgetId],
  );

  const [r, g, b] = currentColor ? hexToRgb(currentColor.hex) : [0, 0, 0];
  const hsl = currentColor ? rgbToHsl(r, g, b) : "";

  return (
    <div className="cpicker">
      {/* Pick button */}
      <button className="cpicker__pick-btn" onClick={startPicking}>
        <span className="cpicker__pick-icon">&#128065;</span>
        Pick Color
      </button>

      {currentColor ? (
        <>
          {/* Current color display */}
          <div className="cpicker__current">
            <div
              className="cpicker__swatch-large"
              style={{ background: currentColor.hex }}
            />
            <div className="cpicker__values">
              <div
                className="cpicker__value-row"
                onClick={() => copyValue(currentColor.hex)}
                title="Click to copy"
              >
                <span className="cpicker__label">HEX</span>
                <span className="cpicker__val">
                  {currentColor.hex}
                  {copied === currentColor.hex && (
                    <span className="cpicker__copied">Copied!</span>
                  )}
                </span>
              </div>
              <div
                className="cpicker__value-row"
                onClick={() => copyValue(currentColor.rgb)}
                title="Click to copy"
              >
                <span className="cpicker__label">RGB</span>
                <span className="cpicker__val">
                  {currentColor.rgb}
                  {copied === currentColor.rgb && (
                    <span className="cpicker__copied">Copied!</span>
                  )}
                </span>
              </div>
              <div
                className="cpicker__value-row"
                onClick={() => copyValue(hsl)}
                title="Click to copy"
              >
                <span className="cpicker__label">HSL</span>
                <span className="cpicker__val">
                  {hsl}
                  {copied === hsl && (
                    <span className="cpicker__copied">Copied!</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* History */}
          {colors.length > 1 && (
            <div className="cpicker__history">
              <div className="cpicker__history-label">History</div>
              <div className="cpicker__history-grid">
                {colors.slice(1).map((c) => (
                  <div
                    key={c.timestamp}
                    className="cpicker__swatch-wrap"
                  >
                    <div
                      className="cpicker__swatch-small"
                      style={{ background: c.hex }}
                      title={c.hex}
                      onClick={() => copyValue(c.hex)}
                    />
                    <button
                      className="cpicker__swatch-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColor(c.timestamp);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="cpicker__empty">Click "Pick Color" to start</div>
      )}
    </div>
  );
}
