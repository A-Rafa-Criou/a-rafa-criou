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
    win.OneSignalDeferred.push(async (OneSignal: OneSignalAPI | undefined) => {
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
      // Defensive: OneSignal may not be passed if the SDK didn't initialize properly
      if (!OneSignal) {
        console.warn('[OneSignal] OneSignal SDK not available - skipping init/login');
        return;
      }
      const OneSignalSDK = OneSignal as OneSignalAPI;
      try {
        // Usa variável de ambiente NEXT_PUBLIC_ONESIGNAL_APP_ID
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
          console.warn('⚠️ NEXT_PUBLIC_ONESIGNAL_APP_ID não configurado');
          return;
        }

        await OneSignalSDK.init({
          appId,
          allowLocalhostAsSecureOrigin: true, // Sempre permitir localhost
          // 🍎 Safari Web ID - OBRIGATÓRIO para iOS/Safari
          safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID || 'web.onesignal.auto.173f6c22-d127-49d5-becc-f12054437d1b',
          // Não mostrar prompt automático - vamos controlar manualmente
          promptOptions: {
            slidedown: {
              enabled: false, // Desabilitar slidedown automático
            }
          },
        });

        // Verificar se está inscrito
        const isPushEnabled = await OneSignalSDK.User?.PushSubscription?.optedIn;

        // Solicitar permissão apenas se NÃO estiver inscrito
        if (!isPushEnabled) {
          const permission = await OneSignalSDK.Notifications?.permission;
          if (permission === 'default') {
            await OneSignalSDK.Slidedown?.promptPush();
          }
        }
      } catch (error) {
        const errorMsg = String(error);
        // Ignorar erros de domínio e inicialização duplicada
        if (
          errorMsg.includes('already initialized') ||
          errorMsg.includes('Can only be used on')
        ) {
          return;
        }
        console.error('❌ Erro ao inicializar OneSignal:', error);
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
    win.OneSignalDeferred.push(async (OneSignal: OneSignalAPI | undefined) => {
      if (!OneSignal) {
        console.warn('[OneSignal] OneSignal SDK not available - skipping session tag update');
        return;
      }
      const OneSignalSDK = OneSignal as OneSignalAPI;
      try {
        // Só faz login se o ID existir
        if (session?.user?.id) {
          try {
            if (OneSignalSDK && typeof OneSignalSDK.login === 'function') {
              await OneSignalSDK.login(session.user.id);
            } else {
              console.warn('[OneSignal] login function missing on SDK - skipping login');
              return; // Se não tem login, não continua
            }
            
            // Verificar se User e seus métodos existem antes de usar
            if (!OneSignalSDK.User || typeof OneSignalSDK.User.addTag !== 'function') {
              console.warn('[OneSignal] User.addTag not available - skipping tag assignment');
              return;
            }

            // Aplicar tag de role
            if (session.user.role === 'admin') {
              await OneSignalSDK.User.addTag('role', 'admin');
              console.log('🔔 [OneSignal] Tag admin aplicada para:', session.user.email);
            } else {
              await OneSignalSDK.User.addTag('role', 'customer');
            }

            // Log de debug para admin
            if (session.user.role === 'admin') {
              const isPushEnabled = OneSignalSDK.User?.PushSubscription?.optedIn;
              const permission = OneSignalSDK.Notifications?.permission;
              const pushSubscriptionId = OneSignalSDK.User?.PushSubscription?.id;
              console.log('🔔 [OneSignal Admin Debug]:', {
                userId: session.user.id,
                email: session.user.email,
                pushEnabled: isPushEnabled,
                permission,
                subscriptionId: pushSubscriptionId,
              });
            }
          } catch (err) {
            const errorMsg = String(err);
            // Ignorar erros conhecidos
            if (
              errorMsg.includes('IndexedDB') || 
              errorMsg.includes('Internal error opening backing store') ||
              errorMsg.includes('Can only be used on')
            ) {
              // Erro esperado em localhost/domínio incorreto - não logar
              return;
            }
            console.error('❌ Erro ao configurar tags OneSignal:', err);
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
        const errorMsg = String(error);
        // Ignorar erros de domínio em desenvolvimento
        if (errorMsg.includes('Can only be used on')) {
          return;
        }
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
