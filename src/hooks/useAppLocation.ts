import { useSyncExternalStore } from "react";
import { getCurrentPath, subscribeToNavigation } from "../utils/navigation";

export function useAppLocation() {
  const pathname = useSyncExternalStore(subscribeToNavigation, getCurrentPath, () => "/");

  return { pathname };
}
