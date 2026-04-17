import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },

  error(message: string, options?: ToastOptions) {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action,
    });
  },

  info(message: string, options?: ToastOptions) {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  },

  warning(message: string, options?: ToastOptions) {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4500,
    });
  },

  loading(message: string) {
    return sonnerToast.loading(message);
  },

  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) {
    return sonnerToast.promise(promise, messages);
  },

  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};
