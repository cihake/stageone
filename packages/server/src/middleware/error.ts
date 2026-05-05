/**
 * Centralized error handling. Always returns JSON; never leaks stack traces
 * outside development. Logs to stderr (Sentry will attach in Phase 5).
 */
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isDev } from '../config/env.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'One or more fields failed validation.',
      issues: err.flatten(),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unhandled. Log full error server-side, return generic message client-side.

  console.error('[error]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong. Please try again.',
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
};
