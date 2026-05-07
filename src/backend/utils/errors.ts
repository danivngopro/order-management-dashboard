import { Response } from 'express';

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_PRIORITY: 'INVALID_PRIORITY',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOO_MANY: 'TOO_MANY',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export type ApiErrorDefinition = {
  status: number;
  error: string;
  code: ErrorCode;
};

export const ERRORS = {
  badRequest: { status: 400, error: 'Bad request', code: ERROR_CODES.BAD_REQUEST },
  invalidJsonBody: { status: 400, error: 'Invalid JSON body', code: ERROR_CODES.BAD_REQUEST },
  requestBodyTooLarge: { status: 400, error: 'Request body too large', code: ERROR_CODES.BAD_REQUEST },
  validationError: { status: 400, error: 'Invalid request', code: ERROR_CODES.VALIDATION_ERROR },
  invalidStatus: { status: 400, error: 'Invalid status', code: ERROR_CODES.INVALID_STATUS },
  invalidPriority: { status: 400, error: 'Invalid priority', code: ERROR_CODES.INVALID_PRIORITY },
  invalidAction: { status: 400, error: 'Invalid action', code: ERROR_CODES.INVALID_ACTION },
  emptyOrderIds: { status: 400, error: 'Empty orderIds', code: ERROR_CODES.INVALID_INPUT },
  emptyOrderIdsSnake: { status: 400, error: 'Empty order_ids', code: ERROR_CODES.INVALID_INPUT },
  tooManyOrderIds: { status: 400, error: 'Too many order IDs', code: ERROR_CODES.TOO_MANY },
  notFound: { status: 404, error: 'Not found', code: ERROR_CODES.NOT_FOUND },
  orderNotFound: { status: 404, error: 'Order not found', code: ERROR_CODES.NOT_FOUND },
  supplierNotFound: { status: 404, error: 'Supplier not found', code: ERROR_CODES.NOT_FOUND },
  jobNotFound: { status: 404, error: 'Job not found', code: ERROR_CODES.NOT_FOUND },
  orderUpdateConflict: { status: 409, error: 'Order is being updated', code: ERROR_CODES.CONFLICT },
  cancelledOrderConflict: { status: 409, error: 'Order is cancelled', code: ERROR_CODES.CONFLICT },
  internalError: { status: 500, error: 'Internal server error', code: ERROR_CODES.INTERNAL_ERROR },
  databaseConnectionFailed: { status: 500, error: 'Database connection failed', code: ERROR_CODES.INTERNAL_ERROR },
} satisfies Record<string, ApiErrorDefinition>;

export function sendError(res: Response, definition: ApiErrorDefinition) {
  return res.status(definition.status).json({
    error: definition.error,
    code: definition.code,
  });
}
