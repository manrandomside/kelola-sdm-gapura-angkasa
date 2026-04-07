// Standard API response envelope. All API routes should return this shape.

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
