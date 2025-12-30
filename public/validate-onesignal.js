/**
 * Script de Validação OneSignal - iOS Safari Support
 *
 * Roda no navegador para verificar se tudo está configurado corretamente
 *
 * USO:
 * 1. Abra o console do navegador (F12)
 * 2. Cole este código e aperte Enter
 * 3. Veja o relatório de validação
 */

(async function validateOneSignalSetup() {
  console.log('🔍 VALIDANDO CONFIGURAÇÃO ONESIGNAL PARA iOS...\n');

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // ✅ 1. Verificar se está no Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isSafari || isIOS) {
    results.passed.push('✅ Navegador: Safari/iOS detectado');
  } else {
    results.warnings.push('⚠️ Navegador: Não é Safari (Web Push funciona apenas no Safari no iOS)');
  }

  // ✅ 2. Verificar variáveis de ambiente
  const hasAppId = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const hasSafariWebId =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID;

  if (hasAppId || typeof window.OneSignal !== 'undefined') {
    results.passed.push('✅ NEXT_PUBLIC_ONESIGNAL_APP_ID: Configurado');
  } else {
    results.failed.push('❌ NEXT_PUBLIC_ONESIGNAL_APP_ID: NÃO configurado');
  }

  if (hasSafariWebId) {
    results.passed.push('✅ NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID: Configurado');
  } else {
    results.warnings.push(
      '⚠️ NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID: Pode estar faltando (necessário para Safari)'
    );
  }

  // ✅ 3. Verificar manifest.json
  try {
    const manifestResponse = await fetch('/manifest.json');
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      results.passed.push('✅ manifest.json: Encontrado');

      if (manifest.gcm_sender_id) {
        results.passed.push('✅ manifest.json: gcm_sender_id configurado');
      } else {
        results.failed.push('❌ manifest.json: gcm_sender_id faltando');
      }
    } else {
      results.failed.push(
        '❌ manifest.json: Não encontrado (HTTP ' + manifestResponse.status + ')'
      );
    }
  } catch (err) {
    results.failed.push('❌ manifest.json: Erro ao buscar - ' + err.message);
  }

  // ✅ 4. Verificar ícones
  const icons = [
    { name: 'apple-touch-icon.png', size: '180x180' },
    { name: 'icon-192x192.png', size: '192x192' },
    { name: 'icon-512x512.png', size: '512x512' },
  ];

  for (const icon of icons) {
    try {
      const response = await fetch('/' + icon.name, { method: 'HEAD' });
      if (response.ok) {
        results.passed.push(`✅ Ícone: /${icon.name} (${icon.size})`);
      } else {
        results.warnings.push(`⚠️ Ícone: /${icon.name} não encontrado`);
      }
    } catch {
      results.warnings.push(`⚠️ Ícone: /${icon.name} erro ao verificar`);
    }
  }

  // ✅ 5. Verificar OneSignal SDK
  if (typeof window.OneSignal !== 'undefined') {
    results.passed.push('✅ OneSignal SDK: Carregado');

    try {
      const isPushEnabled = await window.OneSignal.User?.PushSubscription?.optedIn;
      const permission = await window.OneSignal.Notifications?.permission;

      results.passed.push(`✅ Push Subscription: ${isPushEnabled ? 'Ativo' : 'Inativo'}`);
      results.passed.push(`✅ Permissão: ${permission || 'Desconhecida'}`);

      if (permission === 'granted' && isPushEnabled) {
        results.passed.push('🎉 PUSH NOTIFICATIONS: Totalmente configurado!');
      } else if (permission === 'default') {
        results.warnings.push('⚠️ Permissão ainda não solicitada ao usuário');
      } else if (permission === 'denied') {
        results.failed.push('❌ Permissão negada pelo usuário');
      }

      // Verificar tags
      try {
        const tags = await window.OneSignal.User?.getTags?.();
        if (tags?.role) {
          results.passed.push(`✅ Tag role: ${tags.role}`);
        } else {
          results.warnings.push('⚠️ Tag role não encontrada (faça login)');
        }
      } catch (err) {
        results.warnings.push('⚠️ Não foi possível obter tags: ' + err.message);
      }

      // Verificar Player ID
      try {
        const playerId = await window.OneSignal.User?.PushSubscription?.id;
        if (playerId) {
          results.passed.push(`✅ Player ID: ${playerId.substring(0, 8)}...`);
        } else {
          results.warnings.push('⚠️ Player ID não encontrado (usuário não inscrito)');
        }
      } catch (err) {
        results.warnings.push('⚠️ Erro ao obter Player ID: ' + err.message);
      }
    } catch (err) {
      results.warnings.push('⚠️ Erro ao verificar status OneSignal: ' + err.message);
    }
  } else {
    results.failed.push('❌ OneSignal SDK: NÃO carregado');
  }

  // ✅ 6. Verificar Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const oneSignalSW = registrations.find(
        reg =>
          reg.active?.scriptURL.includes('OneSignal') || reg.active?.scriptURL.includes('onesignal')
      );

      if (oneSignalSW) {
        results.passed.push('✅ Service Worker OneSignal: Registrado');
      } else {
        results.warnings.push('⚠️ Service Worker OneSignal: Não encontrado');
      }
    } catch (err) {
      results.warnings.push('⚠️ Erro ao verificar Service Worker: ' + err.message);
    }
  } else {
    results.failed.push('❌ Service Workers: Não suportados neste navegador');
  }

  // ✅ 7. Verificar meta tags Apple
  const appleTags = [
    'apple-mobile-web-app-capable',
    'apple-mobile-web-app-title',
    'apple-mobile-web-app-status-bar-style',
  ];

  appleTags.forEach(tag => {
    const meta = document.querySelector(`meta[name="${tag}"]`);
    if (meta) {
      results.passed.push(`✅ Meta tag: ${tag}`);
    } else {
      results.warnings.push(`⚠️ Meta tag: ${tag} não encontrada`);
    }
  });

  // 📊 RELATÓRIO FINAL
  console.log('\n📊 ===== RELATÓRIO DE VALIDAÇÃO =====\n');

  console.log('✅ TESTES PASSADOS (' + results.passed.length + '):\n');
  results.passed.forEach(msg => console.log(msg));

  if (results.warnings.length > 0) {
    console.log('\n⚠️ AVISOS (' + results.warnings.length + '):\n');
    results.warnings.forEach(msg => console.log(msg));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FALHAS (' + results.failed.length + '):\n');
    results.failed.forEach(msg => console.log(msg));
  }

  console.log('\n====================================\n');

  if (results.failed.length === 0) {
    console.log('🎉 CONFIGURAÇÃO VÁLIDA! Web Push deve funcionar.\n');
  } else {
    console.log('⚠️ ATENÇÃO: Corrija as falhas acima antes de testar.\n');
  }

  console.log('📖 Veja guia completo: docs/ONESIGNAL-IOS-SETUP.md\n');

  return {
    passed: results.passed.length,
    warnings: results.warnings.length,
    failed: results.failed.length,
    details: results,
  };
})();
