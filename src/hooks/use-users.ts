"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/lib/utils/toast";

import type { UserRole } from "@/lib/constants/enums";
import type { ApiResponse } from "@/types/api";
import type { UserStatus } from "@/types/user";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validations/user";

export interface UserListItem {
  id: string;
  nip: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  employee_id: number | null;
  provider: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface UserListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListStatistics {
  total: number;
  active: number;
  inactive: number;
  superAdmin: number;
  admin: number;
  staff: number;
}

export interface UserListData {
  users: UserListItem[];
  pagination: UserListPagination;
  statistics: UserListStatistics;
}

export interface UseUsersParams {
  page: number;
  limit: number;
  search: string;
  role: string | null;
  status: string | null;
}

function buildQueryString(params: UseUsersParams): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);
  if (params.role) sp.set("role", params.role);
  if (params.status) sp.set("status", params.status);
  return sp.toString();
}

async function fetchUsers(params: UseUsersParams): Promise<UserListData> {
  const qs = buildQueryString(params);
  const res = await fetch(`/api/users?${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<UserListData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useUsers(params: UseUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

interface CreatedUserResponse {
  user: {
    id: string;
    nip: string;
    full_name: string;
    role: UserRole;
  };
}

async function postCreateUser(
  payload: CreateUserInput,
): Promise<CreatedUserResponse["user"]> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<CreatedUserResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.user;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserInput) => postCreateUser(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Pengguna ${created.full_name} berhasil ditambahkan`);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal menambah pengguna";
      toast.error(message);
    },
  });
}

async function putUpdateUser(
  id: string,
  payload: UpdateUserInput,
): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<unknown>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserInput }) =>
      putUpdateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Data pengguna berhasil diperbarui");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal memperbarui pengguna";
      toast.error(message);
    },
  });
}

async function deleteUserRequest(id: string): Promise<string> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = (await res.json()) as ApiResponse<{ message: string }>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.message;
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUserRequest(id),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(message || "Pengguna berhasil dinonaktifkan");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal menonaktifkan pengguna";
      toast.error(message);
    },
  });
}

async function postResetPassword(id: string): Promise<string> {
  const res = await fetch(`/api/users/${id}/reset-password`, {
    method: "POST",
    credentials: "include",
  });

  const json = (await res.json()) as ApiResponse<{ message: string }>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.message;
}

export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postResetPassword(id),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(message || "Password berhasil direset");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal mereset password";
      toast.error(message);
    },
  });
}
