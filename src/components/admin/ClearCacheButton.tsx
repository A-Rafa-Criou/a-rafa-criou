'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

export function ClearCacheButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState('');

  const handleClearCache = async () => {
    setIsClearing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Cache limpo com sucesso!');
        // Recarregar a página após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      setMessage('❌ Erro ao limpar cache');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClearCache}
        disabled={isClearing}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isClearing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Limpando...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Limpar Cache
          </>
        )}
      </Button>
      {message && (
        <p className="text-xs text-center">{message}</p>
      )}
    </div>
  );
}
