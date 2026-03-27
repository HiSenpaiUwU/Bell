import { useEffect, useState } from "react";

export function useDelayedReveal(delay = 550) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delay]);

  return isReady;
}
