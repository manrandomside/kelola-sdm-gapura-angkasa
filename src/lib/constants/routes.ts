// Application route paths. Use helpers untuk route yang butuh parameter dinamis.

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  EMPLOYEES: "/employees",
  EMPLOYEES_CREATE: "/employees/create",
  EMPLOYEES_DETAIL: (id: string | number) => `/employees/${id}`,
  EMPLOYEES_EDIT: (id: string | number) => `/employees/${id}/edit`,
  IMPORT: "/import",
  EXPORT: "/export",
  USERS: "/users",
  ACTIVITY_LOGS: "/activity-logs",
} as const;
