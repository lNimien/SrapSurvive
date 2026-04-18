'use client';

import { useState, useCallback, useEffect } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

let subscribers: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifySubscribers() {
  subscribers.forEach((callback) => callback([...toasts]));
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    subscribers.push(setLocalToasts);
    return () => {
      subscribers = subscribers.filter((s) => s !== setLocalToasts);
    };
  }, []);

  const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, description, variant, duration };
    toasts = [...toasts, newToast];
    notifySubscribers();

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifySubscribers();
    }, duration);
  }, []);

  return { toast, toasts: localToasts };
}
