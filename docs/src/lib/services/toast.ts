import { toast as sonnerToast } from "svelte-sonner";

export function toast(message: string, type: "success" | "error" | "info" | "warning" = "info") {
  switch (type) {
    case "success":
      return sonnerToast.success(message);
    case "error":
      return sonnerToast.error(message);
    case "warning":
      return sonnerToast.warning(message);
    default:
      return sonnerToast.info(message);
  }
}

export function toastSuccess(message: string) {
  return sonnerToast.success(message);
}

export function toastError(message: string) {
  return sonnerToast.error(message);
}

export function toastInfo(message: string) {
  return sonnerToast.info(message);
}

export function toastWarning(message: string) {
  return sonnerToast.warning(message);
}
