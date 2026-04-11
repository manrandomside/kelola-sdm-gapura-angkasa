import type { UserRole } from "@/lib/constants/enums";

export type UserStatus = "active" | "inactive";

// Application user (mirrors the `user` table). NIP is the login identifier.
export interface User {
  id: string;
  supabase_auth_id: string;
  nip: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  employee_id: number | null;
  provider: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// Payload untuk POST /api/users (super_admin only).
// Password default = NIP jika tidak disediakan — lihat service layer.
export interface CreateUserInput {
  nip: string;
  full_name: string;
  password: string;
  email?: string | null;
  role?: UserRole;
  employee_id?: number | null;
}

// Payload untuk PUT /api/users/[id]. Hanya role & status yang boleh diubah.
export interface UpdateUserInput {
  role?: UserRole;
  status?: UserStatus;
}

// Slim user shape returned by /api/auth/session and /api/auth/login.
// Tidak include field internal seperti supabase_auth_id atau timestamp.
export interface SessionUser {
  id: string;
  nip: string;
  full_name: string;
  role: UserRole;
  email: string | null;
  status: UserStatus;
  provider: string | null;
}
