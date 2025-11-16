// Suppress known HMR ping errors in Next.js 15 + Turbopack
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Suppress HMR ping errors
    if (
      message.includes('unrecognized HMR message') ||
      message.includes('{"event":"ping"}') ||
      message.includes('unhandledRejection')
    ) {
      return;
    }
    
    originalError.apply(console, args);
  };
}

export {};
