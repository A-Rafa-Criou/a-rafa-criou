import { useCallback } from 'react';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback((props: ToastProps) => {
    const event = new CustomEvent('show-toast', {
      detail: {
        message: props.description || props.title || '',
        type: props.variant === 'destructive' ? 'error' : 'success',
      },
    });
    window.dispatchEvent(event);
  }, []);

  return { toast };
}
