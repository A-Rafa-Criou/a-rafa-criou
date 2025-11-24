'use client';

import { useEffect, useRef } from 'react';

// Minimal OneSignal SDK typings used by our app
type OneSignalDeferredCallback = (OneSignal: OneSignalAPI) => Promise<void> | void;
interface OneSignalAPI {
  init(config: Record<string, unknown>): Promise<void>;
  login(userId: string): Promise<void>;
  User: {
    PushSubscription: {
      optedIn: boolean;
      id: string | null;
    };
    addTag(tag: string, value: string): Promise<void>;
    getTags(): Promise<Record<string, string>>;
  };
  Notifications: {
    permission: string | 'default' | 'granted' | 'denied';
  };
  Slidedown: {
    promptPush(): Promise<void>;
  };
}

// Use a typed window alias when interacting with OneSignalDeferred to avoid 'any' casts
type WindowWithOneSignal = Window & { OneSignalDeferred?: OneSignalDeferredCallback[]; OneSignal?: OneSignalAPI };
import { useSession } from 'next-auth/react';
import Script from 'next/script';

/**
 * OneSignal Provider - Inicializa e gerencia tags de usuário
 * 
 * - Admin: Tag role:admin (recebe notificações de vendas)
 * - Cliente: Tag role:customer (recebe apenas suas notificações)
 */
export function OneSignalProvider() {
  const { data: session } = useSession();
  const scriptLoaded = useRef(false);

  // ...existing code...

  const handleScriptLoad = () => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (typeof window === 'undefined') return;

    // Inicializar OneSignal
    const win = window as unknown as WindowWithOneSignal;
    win.OneSignalDeferred = win.OneSignalDeferred || [];
    win.OneSignalDeferred.push(async (OneSignal: OneSignalAPI) => {
      // Silenciar avisos conhecidos do OneSignal e navegador
      const originalConsoleWarn = console.warn;
      console.warn = function (...args) {
        const msg = args[0]?.toString?.() || '';
        if (
          msg.includes('PushSubscriptionNamespace: skipping initialization') ||
          msg.includes('deprecation warning: tabReply will be removed')
        ) {
          // Ignorar esses avisos
          return;
        }
        originalConsoleWarn.apply(console, args);
      };
      const OneSignalSDK = OneSignal as OneSignalAPI;
      try {
        await OneSignalSDK.init({
          appId: '7f08dde5-bca5-48be-8b1e-2fb02a1806ff',
          allowLocalhostAsSecureOrigin: true, // Sempre permitir localhost
          // Não mostrar prompt automático - vamos controlar manualmente
          promptOptions: {
            slidedown: {
              enabled: false, // Desabilitar slidedown automático
            }
          },
        });

        // Verificar se está inscrito
        const isPushEnabled = await OneSignalSDK.User.PushSubscription.optedIn;

        // Solicitar permissão apenas se NÃO estiver inscrito
        if (!isPushEnabled) {
          const permission = await OneSignalSDK.Notifications.permission;
          if (permission === 'default') {
            await OneSignalSDK.Slidedown.promptPush();
          }
        }
      } catch (error) {
        // Ignorar erro se já foi inicializado
        const errorMsg = String(error);
        if (!errorMsg.includes('already initialized')) {
          console.error('❌ Erro ao inicializar OneSignal:', error);
        }
      }
    });
  };

  // Atualizar tags quando sessão mudar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!session?.user?.id) {
      return;
    }
    const win = window as unknown as WindowWithOneSignal;
    win.OneSignalDeferred = win.OneSignalDeferred || [];
    win.OneSignalDeferred.push(async (OneSignal: OneSignalAPI) => {
      const OneSignalSDK = OneSignal as OneSignalAPI;
      try {
        // Só faz login se o ID existir
        if (session?.user?.id) {
          try {
            await OneSignalSDK.login(session.user.id);
            // Aplicar tag de role
            if (session.user.role === 'admin') {
              await OneSignalSDK.User.addTag('role', 'admin');
            } else {
              await OneSignalSDK.User.addTag('role', 'customer');
            }
          } catch (err) {
            if (!(String(err).includes('IndexedDB') || String(err).includes('Internal error opening backing store'))) {
              console.error('❌ Erro ao configurar tags OneSignal:', err);
            }
          }
        }

        // NÃO adicionar email - OneSignal usa apenas Web Push
        // Se adicionar email, OneSignal tenta enviar para 2 canais e falha
        // await OneSignal.User.addEmail(session.user.email);

        // Verificar inscrição e permissões (não usadas explicitamente)
        // const isPushEnabled = await OneSignalSDK.User.PushSubscription.optedIn;
        // const permission = await OneSignalSDK.Notifications.permission;
        // const pushSubscription = await OneSignalSDK.User.PushSubscription.id;
        // const tags = await OneSignalSDK.User.getTags();

      } catch (error) {
        console.error('❌ Erro ao configurar tags OneSignal:', error);
      }
    });
  }, [session?.user?.id, session?.user?.role, session?.user?.email]);

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="lazyOnload"
      onLoad={handleScriptLoad}
    />
  );
}
