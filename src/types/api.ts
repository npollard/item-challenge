/**
 * API Types
 */

export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}
