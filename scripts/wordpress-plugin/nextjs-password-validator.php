<?php
/**
 * Plugin Name: NextJS Password Validator
 * Description: API endpoint para validar senhas do WordPress para o Next.js
 * Version: 1.0.0
 * Author: A Rafa Criou
 */

if (!defined('ABSPATH')) {
    exit;
}

// Definir API Key (pode ser movida para wp-config.php)
if (!defined('NEXTJS_API_KEY')) {
    define('NEXTJS_API_KEY', 'wp_a521bccb4d50dd1b2391d09dfb16babdeba490b74f4ffb872236bad686fba2a0');
}

/**
 * Registrar endpoint REST API
 */
add_action('rest_api_init', function () {
    register_rest_route('nextjs/v1', '/validate-password', array(
        'methods' => 'POST',
        'callback' => 'nextjs_validate_password',
        'permission_callback' => '__return_true',
    ));
});

/**
 * Validar senha do usuário
 */
function nextjs_validate_password($request) {
    // 1. Validar API Key
    $api_key = $request->get_header('X-API-Key');
    
    if (empty($api_key) || $api_key !== NEXTJS_API_KEY) {
        return new WP_REST_Response(array(
            'error' => array(
                'code' => '403',
                'message' => 'Invalid API Key',
            )
        ), 403);
    }

    // 2. Obter parâmetros
    $params = $request->get_json_params();
    $email = isset($params['email']) ? sanitize_email($params['email']) : '';
    $password = isset($params['password']) ? $params['password'] : '';

    if (empty($email) || empty($password)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'Missing email or password'
        ), 400);
    }

    // 3. Buscar usuário
    $user = get_user_by('email', $email);

    if (!$user) {
        // Não revelar se usuário existe (segurança)
        return new WP_REST_Response(array(
            'valid' => false,
            'message' => 'Invalid credentials'
        ), 200);
    }

    // 4. Validar senha
    $is_valid = wp_check_password($password, $user->data->user_pass, $user->ID);

    if ($is_valid) {
        return new WP_REST_Response(array(
            'valid' => true,
            'hash' => $user->data->user_pass,
            'user_id' => $user->ID,
            'email' => $user->data->user_email,
            'display_name' => $user->data->display_name
        ), 200);
    }

    return new WP_REST_Response(array(
        'valid' => false,
        'message' => 'Invalid credentials'
    ), 200);
}

/**
 * Adicionar CORS headers
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: X-API-Key, Content-Type, Authorization');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit();
        }
        
        return $value;
    });
}, 15);

/**
 * Log de ativação do plugin
 */
register_activation_hook(__FILE__, function() {
    error_log('NextJS Password Validator Plugin activated');
});
