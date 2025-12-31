import { writable } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const toasts = writable<Toast[]>([]);

export function toast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7);
  const toast: Toast = { id, message, type };
  
  toasts.update(ts => [...ts, toast]);
  
  setTimeout(() => {
    toasts.update(ts => ts.filter(t => t.id !== id));
  }, 3000);
  
  return id;
}

export function toastSuccess(message: string) {
  return toast(message, 'success');
}

export function toastError(message: string) {
  return toast(message, 'error');
}

export function toastInfo(message: string) {
  return toast(message, 'info');
}

export function toastWarning(message: string) {
  return toast(message, 'warning');
}

export function getToasts() {
  return toasts;
}

