import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NotificationToast,
  NotificationTone,
  NotificationTray,
} from "../components/feedback/NotificationTray";

interface NotificationInput {
  title: string;
  message?: string;
  tone?: NotificationTone;
}

interface NotificationContextValue {
  notify: (input: NotificationInput) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

function generateNotificationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const timeoutMap = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timeoutId = timeoutMap.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMap.current.delete(id);
    }

    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.id !== id),
    );
  }, []);

  const notify = useCallback(
    ({ title, message, tone = "success" }: NotificationInput) => {
      const id = generateNotificationId();
      const nextNotification: NotificationToast = { id, title, message, tone };

      setNotifications((currentNotifications) => [
        ...currentNotifications,
        nextNotification,
      ].slice(-4));

      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, 3600);

      timeoutMap.current.set(id, timeoutId);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timeoutMap.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMap.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
    }),
    [dismiss, notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationTray notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }

  return context;
}
