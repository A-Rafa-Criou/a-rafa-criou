<?php
/**
 * Plugin Name: Debug Password Hash
 * Description: Mostra informações sobre hashes de senha (TEMPORÁRIO - DELETE APÓS USO)
 * Version: 1.0
 * Author: Debug
 */

// Adicionar página de admin
add_action('admin_menu', function() {
    add_menu_page(
        'Debug Password',
        'Debug Password',
        'manage_options',
        'debug-password',
        'debug_password_page',
        'dashicons-lock',
        100
    );
});

function debug_password_page() {
    // Apenas admins
    if (!current_user_can('manage_options')) {
        wp_die('Acesso negado');
    }
    
    $email = 'edduardooo2011@hotmail.com';
    $password = '@Nike2011@';
    
    echo '<div class="wrap">';
    echo '<h1>🔐 Debug Password Hash</h1>';
    
    // Buscar usuário
    $user = get_user_by('email', $email);
    
    if (!$user) {
        echo '<div class="error"><p>❌ Usuário não encontrado: ' . esc_html($email) . '</p></div>';
        echo '</div>';
        return;
    }
    
    // Hash atual no banco
    global $wpdb;
    $current_hash = $wpdb->get_var($wpdb->prepare(
        "SELECT user_pass FROM $wpdb->users WHERE ID = %d",
        $user->ID
    ));
    
    echo '<h2>📊 Dados do Usuário</h2>';
    echo '<table class="widefat">';
    echo '<tr><th>ID</th><td>' . $user->ID . '</td></tr>';
    echo '<tr><th>Email</th><td>' . esc_html($user->user_email) . '</td></tr>';
    echo '<tr><th>Login</th><td>' . esc_html($user->user_login) . '</td></tr>';
    echo '</table>';
    
    echo '<h2>🔑 Hash Atual no Banco</h2>';
    echo '<p><code style="background:#f5f5f5;padding:10px;display:block;word-break:break-all;">';
    echo esc_html($current_hash);
    echo '</code></p>';
    echo '<p><strong>Tamanho:</strong> ' . strlen($current_hash) . ' chars</p>';
    
    // Testar senha atual
    $check = wp_check_password($password, $current_hash, $user->ID);
    echo '<h2>✅ Teste com Senha: <code>' . esc_html($password) . '</code></h2>';
    
    if ($check) {
        echo '<div class="notice notice-success"><p style="font-size:18px;"><strong>✅ SENHA CORRETA!</strong></p></div>';
        echo '<p>O WordPress <strong>ACEITA</strong> esta senha com o hash atual.</p>';
    } else {
        echo '<div class="notice notice-error"><p style="font-size:18px;"><strong>❌ SENHA INCORRETA</strong></p></div>';
        echo '<p>O WordPress <strong>NÃO ACEITA</strong> esta senha com o hash atual.</p>';
    }
    
    // Gerar novo hash
    $new_hash = wp_hash_password($password);
    echo '<h2>🆕 Novo Hash Gerado (com mesma senha)</h2>';
    echo '<p><code style="background:#f5f5f5;padding:10px;display:block;word-break:break-all;">';
    echo esc_html($new_hash);
    echo '</code></p>';
    echo '<p><strong>Tamanho:</strong> ' . strlen($new_hash) . ' chars</p>';
    
    // Testar novo hash
    $check_new = wp_check_password($password, $new_hash, $user->ID);
    echo '<h2>✅ Teste do Novo Hash</h2>';
    if ($check_new) {
        echo '<div class="notice notice-success"><p><strong>✅ NOVO HASH VÁLIDO!</strong></p></div>';
    } else {
        echo '<div class="notice notice-error"><p><strong>❌ NOVO HASH INVÁLIDO</strong></p></div>';
    }
    
    // Comparar
    echo '<h2>🔍 Comparação</h2>';
    echo '<table class="widefat">';
    echo '<tr><th>Hash Atual</th><td><code>' . esc_html(substr($current_hash, 0, 50)) . '...</code></td></tr>';
    echo '<tr><th>Novo Hash</th><td><code>' . esc_html(substr($new_hash, 0, 50)) . '...</code></td></tr>';
    echo '<tr><th>São Iguais?</th><td><strong>' . ($current_hash === $new_hash ? 'SIM' : 'NÃO') . '</strong></td></tr>';
    echo '</table>';
    
    // Instruções
    echo '<hr>';
    echo '<h2>📋 Próximos Passos</h2>';
    echo '<ol>';
    echo '<li>Se mostrou <strong>✅ SENHA CORRETA</strong>, copie o <strong>Hash Atual</strong> completo</li>';
    echo '<li>Cole o hash no chat do GitHub Copilot</li>';
    echo '<li><strong style="color:red;">DESATIVE E DELETE este plugin!</strong></li>';
    echo '</ol>';
    
    echo '<div class="notice notice-warning">';
    echo '<p><strong>⚠️ SEGURANÇA:</strong> Este plugin mostra informações sensíveis. Delete após o uso!</p>';
    echo '</div>';
    
    echo '</div>';
}
