// Endpoint REST API para validar senhas do WordPress e sincronizar com Next.js
// SEGURO: Apenas lê dados, nunca escreve no banco
add_action('rest_api_init', function() {
    register_rest_route('nextjs/v1', '/validate-password', [
        'methods' => 'POST',
        'callback' => 'validate_wordpress_password_nextjs',
        'permission_callback' => '__return_true',
    ]);
});

function validate_wordpress_password_nextjs($request) {
    // API Key de segurança (MESMA do .env.local do Next.js)
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
    
    // Buscar usuário (APENAS LEITURA)
    $user = get_user_by('email', $email);
    
    if (!$user) {
        return new WP_Error('user_not_found', 'User not found', ['status' => 404]);
    }
    
    // Validar senha (APENAS VERIFICA - NÃO MODIFICA)
    // Respeita Ultimate Member e outros plugins
    $valid = wp_check_password($password, $user->data->user_pass, $user->ID);
    
    if (!$valid) {
        return [
            'valid' => false,
            'message' => 'Invalid password',
        ];
    }
    
    // Gerar hash bcrypt limpo (NÃO SALVA - APENAS RETORNA)
    $new_hash = wp_hash_password($password);
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
