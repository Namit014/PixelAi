export function getSafeErrorMessage(error: Error | unknown): string {
  const err = error instanceof Error ? error : new Error('Unknown error');
  
  // Log detailed error server-side only
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    errorType: err.constructor.name,
    message: err.message,
  });
  
  // Return generic messages to client
  if (err.message.includes('Unauthorized') || err.message.includes('authentication')) {
    return 'Authentication required';
  }
  
  if (err.message.includes('not found') || err.message.includes('does not exist')) {
    return 'Resource not found';
  }
  
  if (err.message.includes('Invalid') || err.message.includes('validation')) {
    return 'Invalid request data';
  }
  
  if (err.message.includes('rate limit')) {
    return 'Too many requests. Please try again later.';
  }
  
  // Pass through file limit errors
  if (err.message.includes('Too many files') || err.message.includes('Maximum')) {
    return err.message;
  }
  
  return 'An error occurred. Please try again later.';
}

export function sanitizeLog(data: Record<string, any>): Record<string, any> {
  return {
    ...data,
    userId: data.userId ? data.userId.substring(0, 8) + '...' : undefined,
    user_id: data.user_id ? data.user_id.substring(0, 8) + '...' : undefined,
    email: data.email ? '***@' + data.email.split('@')[1] : undefined,
    timestamp: new Date().toISOString(),
  };
}
