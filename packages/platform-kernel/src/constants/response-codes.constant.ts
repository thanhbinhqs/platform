/**
 * Standard HTTP response messages mapped to error codes.
 */
export const ResponseMessages: Record<string, string> = {
  // Success
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RESTORED: 'Resource restored successfully',

  // Errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  VALIDATION_ERROR: 'Validation failed',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  FORBIDDEN: 'Access denied',
  UNAUTHORIZED: 'Authentication required',
  BAD_REQUEST: 'Invalid request',
  RATE_LIMITED: 'Too many requests, please try again later',
};
