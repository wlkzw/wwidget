import { useState, useEffect, useCallback, useRef } from "react";
import type { MemoData } from "@shared/types";
import "./MemoWidget.css";

interface MemoWidgetProps {
  widgetId: string;
  data: MemoData;
}

export function MemoWidget({
  widgetId,
  data,
}: MemoWidgetProps): React.JSX.Element {
  const [content, setContent] = useState(data.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (text: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        window.electronAPI.widgets.updateData(widgetId, {
          content: text,
        } as MemoData);
      }, 800);
    },
    [widgetId],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const text = e.target.value;
    setContent(text);
    save(text);
  };

  return (
    <textarea
      className="memo-textarea"
      value={content}
      onChange={handleChange}
      placeholder="Write something..."
      spellCheck={false}
    />
  );
}
