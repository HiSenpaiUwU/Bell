import { useEffect, useState } from "react";
import { useNotifications } from "../../context/NotificationContext";

interface DeferredPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton() {
  const { notify } = useNotifications();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      notify({
        title: "Install Bell Fresh",
        message: "Use your browser menu to add Bell Fresh to your home screen.",
        tone: "info",
      });
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    notify({
      title: choice.outcome === "accepted" ? "App install started" : "Install dismissed",
      message:
        choice.outcome === "accepted"
          ? "Bell Fresh is being added like a mobile app."
          : "You can still install Bell Fresh later from the browser menu.",
      tone: choice.outcome === "accepted" ? "success" : "info",
    });

    setDeferredPrompt(null);
  };

  return (
    <button type="button" className="ghost-button install-app-button" onClick={handleInstall}>
      {isInstalled ? "App Installed" : "Install App"}
    </button>
  );
}
