import { useEffect, useState } from "react";

/**
 * Verilen değeri belirtilen süre boyunca geciktirerek güncelleyen hook (v1.4-01).
 *
 * Arama kutusu gibi sık tetiklenen girdilerde sunucuya her tuş vuruşunda
 * istek atılmasını engellemek için kullanılır.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
