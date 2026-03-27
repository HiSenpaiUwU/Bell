import { useEffect, useRef } from "react";

export function useAutoScrollToBottom(trigger: string) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [trigger]);

  return endRef;
}
