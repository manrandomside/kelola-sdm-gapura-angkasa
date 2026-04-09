import { z } from "zod";

import { USER_ROLE_OPTIONS } from "@/lib/constants/enums";

// Schema untuk POST /api/users (super_admin only).
// Password minimum 6 karakter; default value di UI = NIP.
export const createUserSchema = z.object({
  nip: z
    .string()
    .trim()
    .min(1, "NIP wajib diisi")
    .max(30, "NIP maksimal 30 karakter"),
  full_name: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(200, "Nama lengkap maksimal 200 karakter"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(72, "Password maksimal 72 karakter"),
  role: z.enum(USER_ROLE_OPTIONS, {
    message: "Role tidak valid",
  }),
  email: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      if (trimmed === "") return null;
      return trimmed;
    })
    .pipe(z.string().email("Format email tidak valid").nullable()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Schema untuk PUT /api/users/[id]. Hanya role & status yang dapat diubah.
export const updateUserSchema = z
  .object({
    role: z.enum(USER_ROLE_OPTIONS, { message: "Role tidak valid" }).optional(),
    status: z
      .enum(["active", "inactive"], { message: "Status tidak valid" })
      .optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: "Minimal satu field harus diisi",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
