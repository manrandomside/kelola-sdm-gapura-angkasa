"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ROUTES } from "@/lib/constants/routes";

import type { ApiResponse } from "@/types/api";
import type { SessionUser } from "@/types/user";

const SESSION_QUERY_KEY = ["auth", "session"] as const;

interface SessionResponse {
  user: SessionUser;
}

interface LoginInput {
  nip: string;
  password: string;
}

interface LoginResponse {
  user: SessionUser;
}

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
    return null;
  }

  const json = (await res.json()) as ApiResponse<SessionResponse>;
  if (!json.success) {
    return null;
  }
  return json.data.user;
}

async function postLogin(input: LoginInput): Promise<SessionUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as ApiResponse<LoginResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.user;
}

async function postLogout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: postLogin,
    onSuccess: (sessionUser) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, sessionUser);
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.clear();
      router.replace(ROUTES.LOGIN);
      router.refresh();
    },
  });

  const login = useCallback(
    (input: LoginInput) => loginMutation.mutateAsync(input),
    [loginMutation],
  );

  const logout = useCallback(
    () => logoutMutation.mutateAsync(),
    [logoutMutation],
  );

  return {
    user: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!sessionQuery.data,
    login,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    logout,
    isLoggingOut: logoutMutation.isPending,
    refetch: sessionQuery.refetch,
  };
}
