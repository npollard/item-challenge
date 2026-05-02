import { ApiResponse } from '../types/api.js';

export function success<T>(statusCode: number, data: T): ApiResponse<T> {
  return {
    statusCode,
    body: data,
  };
}

export function failure(statusCode: number, message: string): ApiResponse<{ error: string }> {
  return {
    statusCode,
    body: { error: message },
  };
}
