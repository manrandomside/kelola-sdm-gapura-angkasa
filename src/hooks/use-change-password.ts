"use client";

import { useMutation } from "@tanstack/react-query";

import { toast } from "@/lib/utils/toast";
import { TOAST_MESSAGES } from "@/lib/constants/toast-messages";

import type { ApiResponse } from "@/types/api";

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

async function changePassword(
  payload: ChangePasswordPayload,
): Promise<string> {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<{ message: string }>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.message;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success(TOAST_MESSAGES.PASSWORD_CHANGED);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
