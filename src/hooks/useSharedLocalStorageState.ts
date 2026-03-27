import { Dispatch, SetStateAction, useEffect, useState } from "react";

function readStoredValue<T>(key: string, initialValue: T) {
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
}

export function useSharedLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save "${key}" to localStorage.`, error);
    }
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }

      setValue(readStoredValue(key, initialValue));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [initialValue, key]);

  return [value, setValue];
}
