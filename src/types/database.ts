import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type {
  activityLog,
  appSetting,
  employee,
  importLog,
  organization,
  subUnit,
  unit,
  user,
} from "@/lib/db/schema";

// Row types (hasil SELECT) — gunakan untuk return value dari query.
export type EmployeeRow = InferSelectModel<typeof employee>;
export type UserRow = InferSelectModel<typeof user>;
export type OrganizationRow = InferSelectModel<typeof organization>;
export type UnitRow = InferSelectModel<typeof unit>;
export type SubUnitRow = InferSelectModel<typeof subUnit>;
export type ActivityLogRow = InferSelectModel<typeof activityLog>;
export type ImportLogRow = InferSelectModel<typeof importLog>;
export type AppSettingRow = InferSelectModel<typeof appSetting>;

// Insert types — gunakan untuk payload db.insert(...).values(...).
export type EmployeeInsert = InferInsertModel<typeof employee>;
export type UserInsert = InferInsertModel<typeof user>;
export type OrganizationInsert = InferInsertModel<typeof organization>;
export type UnitInsert = InferInsertModel<typeof unit>;
export type SubUnitInsert = InferInsertModel<typeof subUnit>;
export type ActivityLogInsert = InferInsertModel<typeof activityLog>;
export type ImportLogInsert = InferInsertModel<typeof importLog>;
export type AppSettingInsert = InferInsertModel<typeof appSetting>;
