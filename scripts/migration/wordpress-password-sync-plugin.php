<?php
/**
 * Plugin Name: Sync Password to Next.js
 * Description: Valida senhas do WordPress e sincroniza com Next.js
 * Version: 1.0
 */

// Endpoint REST API para validar senhas
add_action('rest_api_init', function() {
    register_rest_route('nextjs/v1', '/validate-password', [
        'methods' => 'POST',
        'callback' => 'validate_wordpress_password',
        'permission_callback' => '__return_true', // Validação por API key
    ]);
});

function validate_wordpress_password($request) {
    // API Key de segurança
    $api_key = $request->get_header('X-API-Key');
    $expected_key = 'wp_a521bccb4d50dd1b2391d09dfb16babdeba490b74f4ffb872236bad686fba2a0';
    
    if ($api_key !== $expected_key) {
        return new WP_Error('unauthorized', 'Invalid API key', ['status' => 401]);
    }
    
    // Dados do request
    $params = $request->get_json_params();
    $email = sanitize_email($params['email'] ?? '');
    $password = $params['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        return new WP_Error('missing_data', 'Email and password required', ['status' => 400]);
    }
    
    // Buscar usuário
    $user = get_user_by('email', $email);
    
    if (!$user) {
        return new WP_Error('user_not_found', 'User not found', ['status' => 404]);
    }
    
    // Validar senha usando wp_check_password (respeita plugins como Ultimate Member)
    $valid = wp_check_password($password, $user->data->user_pass, $user->ID);
    
    if (!$valid) {
        return [
            'valid' => false,
            'message' => 'Invalid password',
        ];
    }
    
    // Gerar novo hash bcrypt limpo
    $new_hash = wp_hash_password($password);
    
    // Remover prefixo $wp$ se existir
    $clean_hash = str_replace('$wp$', '$', $new_hash);
    
    return [
        'valid' => true,
        'user_id' => $user->ID,
        'email' => $user->user_email,
        'hash' => $clean_hash,
        'hash_length' => strlen($clean_hash),
        'message' => 'Password validated successfully',
    ];
}

// Adicionar página de instruções
add_action('admin_menu', function() {
    add_submenu_page(
        'tools.php',
        'Next.js Sync',
        'Next.js Sync',
        'manage_options',
        'nextjs-sync',
        function() {
            ?>
            <div class="wrap">
                <h1>🔐 Next.js Password Sync</h1>
                
                <div class="notice notice-info">
                    <h2>📋 Configuração</h2>
                    <ol>
                        <li>Edite o plugin e troque <code>SUA_CHAVE_SECRETA_AQUI</code> por uma chave forte</li>
                        <li>Use a mesma chave no Next.js</li>
                        <li>Endpoint: <code><?php echo rest_url('nextjs/v1/validate-password'); ?></code></li>
                    </ol>
                </div>
                
                <div class="notice notice-warning">
                    <h2>🔒 Segurança</h2>
                    <ul>
                        <li>✅ Sempre use HTTPS</li>
                        <li>✅ Troque a API key para algo forte</li>
                        <li>✅ Implemente rate limiting no Next.js</li>
                        <li>✅ Registre tentativas de login</li>
                    </ul>
                </div>
                
                <div class="card">
                    <h2>📝 Exemplo de Uso (cURL)</h2>
                    <pre style="background:#f5f5f5;padding:15px;overflow:auto;">
curl -X POST <?php echo rest_url('nextjs/v1/validate-password'); ?> \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_CHAVE_SECRETA_AQUI" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123"
  }'
                    </pre>
                </div>
                
                <div class="card">
                    <h2>✅ Resposta de Sucesso</h2>
                    <pre style="background:#f5f5f5;padding:15px;">
{
  "valid": true,
  "user_id": 1330,
  "email": "usuario@example.com",
  "hash": "$2y$10$...",
  "hash_length": 60,
  "message": "Password validated successfully"
}
                    </pre>
                </div>
            </div>
            <?php
        }
    );
});
