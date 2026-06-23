import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toastContextObject';

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  return <ToastContext.Provider value={{ toast, notify }}>{children}</ToastContext.Provider>;
}
