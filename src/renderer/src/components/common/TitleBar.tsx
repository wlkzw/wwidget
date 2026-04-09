import "./TitleBar.css";

interface TitleBarProps {
  title: string;
  onClose?: () => void;
  showMinimize?: boolean;
  draggable?: boolean;
  children?: React.ReactNode;
}

export function TitleBar({
  title,
  onClose,
  showMinimize = false,
  draggable = true,
  children,
}: TitleBarProps): React.JSX.Element {
  const handleMinimize = (): void => {
    window.electronAPI.window.minimize();
  };

  const handleClose = (): void => {
    if (onClose) {
      onClose();
    } else {
      window.electronAPI.window.close();
    }
  };

  return (
    <div className={`title-bar ${draggable ? "title-bar--draggable" : ""}`}>
      <span className="title-bar__title">{title}</span>
      <div className="title-bar__actions">
        {children}
        {showMinimize && (
          <button
            className="title-bar__btn title-bar__btn--minimize"
            onClick={handleMinimize}
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          className="title-bar__btn title-bar__btn--close"
          onClick={handleClose}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
