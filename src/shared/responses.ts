import { ApiResponse } from '../types/api.js';
import { ZodError } from 'zod';

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

export function validationFailure(err: ZodError): ApiResponse<{ error: string }> {
  const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return failure(400, `Validation error: ${messages}`);
}
