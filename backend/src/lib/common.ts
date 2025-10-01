import { z } from 'zod';
import { Request, Response } from 'express';

export function paginate<T>(items: T[], limit: number, pageToken?: string) {
  const start = pageToken ? parseInt(Buffer.from(pageToken, 'base64').toString('utf8')) : 0;
  const end = Math.min(start + limit, items.length);
  const nextPageToken = end < items.length ? Buffer.from(String(end)).toString('base64') : null;
  return {
    items: items.slice(start, end),
    nextPageToken
  };
}

export function parseListParams(req: Request) {
  const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '25'))));
  const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;
  return { limit, pageToken };
}

export function sendZodError(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: 'ValidationError', details: error.flatten() });
}
