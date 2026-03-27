import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) {
      return initialValue;
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save "${key}" to localStorage.`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
