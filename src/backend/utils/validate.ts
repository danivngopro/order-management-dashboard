import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ERRORS, sendError } from './errors.js';

export type ValidatedRequest<Q = unknown, B = unknown, P = unknown> = Request & {
  validated: {
    query: Q;
    body: B;
    params: P;
  };
};

declare global {
  namespace Express {
    interface Request {
      validated?: {
        query?: unknown;
        body?: unknown;
        params?: unknown;
      };
    }
  }
}

function assignValidated(req: Request, key: 'query' | 'body' | 'params', value: unknown) {
  req.validated ??= {};
  req.validated[key] = value;
}

function makeValidator<T extends z.ZodTypeAny>(source: 'query' | 'body' | 'params', schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return sendError(res, ERRORS.validationError);
    }

    assignValidated(req, source, result.data);
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return makeValidator('query', schema);
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return makeValidator('body', schema);
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return makeValidator('params', schema);
}

export function getValidatedQuery<T>(req: Request): T {
  return req.validated?.query as T;
}

export function getValidatedBody<T>(req: Request): T {
  return req.validated?.body as T;
}

export function getValidatedParams<T>(req: Request): T {
  return req.validated?.params as T;
}
