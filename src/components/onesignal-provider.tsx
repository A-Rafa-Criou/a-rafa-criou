'use client';

import { useEffect, useRef } from 'react';
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

  const handleScriptLoad = () => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (typeof window === 'undefined') return;

    console.log('🔔 Inicializando OneSignal...');

    // Inicializar OneSignal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).OneSignalDeferred.push(async (OneSignal: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OneSignalSDK = OneSignal as any;
      try {
        await OneSignalSDK.init({
          appId: '173f6c22-d127-49d5-becc-f12054437d1b',
          allowLocalhostAsSecureOrigin: true, // Sempre permitir localhost
          // Não mostrar prompt automático - vamos controlar manualmente
          promptOptions: {
            slidedown: {
              enabled: false, // Desabilitar slidedown automático
            }
          },
        });

        console.log('✅ OneSignal inicializado com sucesso');

        // Verificar se está inscrito
        const isPushEnabled = await OneSignalSDK.User.PushSubscription.optedIn;
        console.log('🔔 Push habilitado:', isPushEnabled);

        // Solicitar permissão apenas se NÃO estiver inscrito
        if (!isPushEnabled) {
          const permission = await OneSignalSDK.Notifications.permission;
          console.log('🔔 Permissão de notificações:', permission);

          if (permission === 'default') {
            console.log('🔔 Solicitando permissão de notificações...');
            await OneSignalSDK.Slidedown.promptPush();
          }
        }
      } catch (error) {
        // Ignorar erro se já foi inicializado
        const errorMsg = String(error);
        if (!errorMsg.includes('already initialized')) {
          console.error('❌ Erro ao inicializar OneSignal:', error);
        } else {
          console.log('ℹ️ OneSignal já estava inicializado');
        }
      }
    });
  };

  // Atualizar tags quando sessão mudar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!session?.user?.id) {
      console.log('ℹ️ Aguardando sessão do usuário...');
      return;
    }

    console.log('👤 Configurando usuário OneSignal:', session.user.email, 'Role:', session.user.role);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).OneSignalDeferred.push(async (OneSignal: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OneSignalSDK = OneSignal as any;
      try {
        // Login com ID do usuário
        await OneSignalSDK.login(session.user.id);
        console.log('✅ OneSignal: Login efetuado com ID:', session.user.id);

        // Aplicar tag de role
        if (session.user.role === 'admin') {
          await OneSignalSDK.User.addTag('role', 'admin');
          console.log('✅ OneSignal: Tag "admin" aplicada - você receberá notificações de vendas');
        } else {
          await OneSignalSDK.User.addTag('role', 'customer');
          console.log('✅ OneSignal: Tag "customer" aplicada');
        }

        // NÃO adicionar email - OneSignal usa apenas Web Push
        // Se adicionar email, OneSignal tenta enviar para 2 canais e falha
        // await OneSignal.User.addEmail(session.user.email);

        // Verificar inscrição e permissões
        const isPushEnabled = await OneSignalSDK.User.PushSubscription.optedIn;
        const permission = await OneSignalSDK.Notifications.permission;
        const pushSubscription = await OneSignalSDK.User.PushSubscription.id;

        console.log('📊 Status OneSignal:');
        console.log('  - Push habilitado:', isPushEnabled);
        console.log('  - Permissão:', permission);
        console.log('  - Subscription ID:', pushSubscription);
        console.log('  - User ID:', session.user.id);
        console.log('  - Role:', session.user.role);

        // Verificar tags aplicadas
        const tags = await OneSignalSDK.User.getTags();
        console.log('🏷️ Tags aplicadas:', tags);

        if (isPushEnabled) {
          console.log('✅ Você está inscrito para receber notificações push');
        } else {
          console.log('⚠️ Notificações push ainda não estão habilitadas. Clique em "Permitir" quando solicitado.');
        }

      } catch (error) {
        console.error('❌ Erro ao configurar tags OneSignal:', error);
      }
    });
  }, [session?.user?.id, session?.user?.role, session?.user?.email]);

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      onLoad={handleScriptLoad}
    />
  );
}
