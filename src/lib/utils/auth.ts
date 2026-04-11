// Helper functions for multi-provider Super Admin access control.

interface UserWithProvider {
  role: string;
  provider?: string | null;
}

// Check whether a user is a Gapura Super Admin (full access to all data).
// A super_admin with provider = 'PT Gapura Angkasa', NULL, or undefined
// is treated as a Gapura admin with unrestricted access.
export function isGapuraAdmin(user: UserWithProvider): boolean {
  return (
    user.role === "super_admin" &&
    (user.provider === "PT Gapura Angkasa" ||
      user.provider === null ||
      user.provider === undefined)
  );
}

// Return the provider filter string for query scoping.
// - Returns null if the user can access all data (Gapura admin).
// - Returns the provider name if the user is scoped to a specific provider.
// - Returns null for admin/staff (no provider scope for now).
export function getProviderFilter(user: UserWithProvider): string | null {
  if (isGapuraAdmin(user)) return null;
  if (user.role === "super_admin" && user.provider) return user.provider;
  return null;
}
