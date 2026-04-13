// Application route paths. Use helpers untuk route yang butuh parameter dinamis.

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  EMPLOYEES: "/employees",
  EMPLOYEES_CREATE: "/employees/create",
  EMPLOYEES_DETAIL: (id: string | number) => `/employees/${id}`,
  EMPLOYEES_EDIT: (id: string | number) => `/employees/${id}/edit`,
  IMPORT: "/import",
  EXPORT: "/export",
  USERS: "/users",
  REKAP_SDM: "/rekap-sdm",
  ACTIVITY_LOGS: "/activity-logs",
} as const;
