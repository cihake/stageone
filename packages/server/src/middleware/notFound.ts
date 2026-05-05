import type { RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
};
