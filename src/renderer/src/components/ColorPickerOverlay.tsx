import { useEffect, useRef, useState } from "react";
import "./ColorPickerOverlay.css";

export function ColorPickerOverlay(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [color, setColor] = useState("#000000");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = window.electronAPI.colorPicker.onScreenshot((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        setReady(true);
      };
      img.src = dataUrl;
    });

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        window.electronAPI.colorPicker.sendCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getPixelColor = (
    x: number,
    y: number,
  ): { hex: string; rgb: string } => {
    const canvas = canvasRef.current;
    if (!canvas) return { hex: "#000000", rgb: "rgb(0, 0, 0)" };
    const ctx = canvas.getContext("2d")!;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      "#" +
      ((1 << 24) | (pixel[0] << 16) | (pixel[1] << 8) | pixel[2])
        .toString(16)
        .slice(1)
        .toUpperCase();
    const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    return { hex, rgb };
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    setPos({ x: e.clientX, y: e.clientY });
    const { hex } = getPixelColor(e.clientX, e.clientY);
    setColor(hex);
  };

  const handleClick = (e: React.MouseEvent): void => {
    const { hex, rgb } = getPixelColor(e.clientX, e.clientY);
    window.electronAPI.colorPicker.sendPicked(hex, rgb);
  };

  // Magnifier rendering
  const magSize = 120;
  const magZoom = 8;
  const magPixels = magSize / magZoom;
  const magStyle: React.CSSProperties = {
    position: "fixed",
    left: pos.x + 20,
    top: pos.y + 20,
    width: magSize,
    height: magSize,
    pointerEvents: "none",
    zIndex: 10,
  };

  // Keep magnifier on screen
  if (pos.x + 20 + magSize > window.innerWidth) {
    magStyle.left = pos.x - magSize - 20;
  }
  if (pos.y + 20 + magSize > window.innerHeight) {
    magStyle.top = pos.y - magSize - 20;
  }

  return (
    <div
      className="color-overlay"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="color-overlay__canvas" />

      {ready && (
        <>
          {/* Crosshair */}
          <div className="color-overlay__crosshair-h" style={{ top: pos.y }} />
          <div className="color-overlay__crosshair-v" style={{ left: pos.x }} />

          {/* Magnifier */}
          <div style={magStyle}>
            <canvas
              className="color-overlay__magnifier"
              width={magSize}
              height={magSize}
              ref={(el) => {
                if (!el || !canvasRef.current) return;
                const ctx = el.getContext("2d")!;
                ctx.imageSmoothingEnabled = false;
                const srcX = pos.x - Math.floor(magPixels / 2);
                const srcY = pos.y - Math.floor(magPixels / 2);
                ctx.clearRect(0, 0, magSize, magSize);
                ctx.drawImage(
                  canvasRef.current,
                  srcX,
                  srcY,
                  magPixels,
                  magPixels,
                  0,
                  0,
                  magSize,
                  magSize,
                );
                // Draw center pixel highlight
                const cx = Math.floor(magSize / 2) - Math.floor(magZoom / 2);
                const cy = Math.floor(magSize / 2) - Math.floor(magZoom / 2);
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.strokeRect(cx, cy, magZoom, magZoom);
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 1;
                ctx.strokeRect(cx - 1, cy - 1, magZoom + 2, magZoom + 2);
              }}
            />
            <div
              className="color-overlay__mag-label"
              style={{ background: color }}
            >
              <span
                className="color-overlay__mag-text"
                style={{
                  color:
                    parseInt(color.slice(1), 16) > 0x888888 ? "#000" : "#fff",
                }}
              >
                {color}
              </span>
            </div>
          </div>
        </>
      )}

      {!ready && <div className="color-overlay__loading">Loading...</div>}
    </div>
  );
}
