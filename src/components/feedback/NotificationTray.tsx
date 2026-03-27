export type NotificationTone = "success" | "info" | "warning";

export interface NotificationToast {
  id: string;
  title: string;
  message?: string;
  tone: NotificationTone;
}

interface NotificationTrayProps {
  notifications: NotificationToast[];
  onDismiss: (id: string) => void;
}

function ToastSuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function ToastInfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M12 10v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <circle cx="12" cy="7" r="1.35" fill="currentColor" />
    </svg>
  );
}

function ToastWarningIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 4l8.2 14.2A1.2 1.2 0 0 1 19.16 20H4.84a1.2 1.2 0 0 1-1.04-1.8L12 4z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 9v4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <circle cx="12" cy="16.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function ToastCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function getToneIcon(tone: NotificationTone) {
  switch (tone) {
    case "warning":
      return <ToastWarningIcon />;
    case "info":
      return <ToastInfoIcon />;
    default:
      return <ToastSuccessIcon />;
  }
}

export function NotificationTray({
  notifications,
  onDismiss,
}: NotificationTrayProps) {
  return (
    <div className="toast-tray" aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className={`toast toast--${notification.tone}`}
          role="status"
        >
          <div className="toast__icon" aria-hidden="true">
            {getToneIcon(notification.tone)}
          </div>

          <div className="toast__copy">
            <p className="toast__title">{notification.title}</p>
            {notification.message ? (
              <p className="toast__message">{notification.message}</p>
            ) : null}
          </div>

          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(notification.id)}
          >
            <ToastCloseIcon />
          </button>

          <span className="toast__progress" aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}
