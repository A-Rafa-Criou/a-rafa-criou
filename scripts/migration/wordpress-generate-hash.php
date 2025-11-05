<?php
/**
 * SCRIPT PARA GERAR HASH CORRETO NO WORDPRESS
 * 
 * INSTRUÇÕES:
 * 1. Coloque este arquivo na raiz do WordPress (onde está wp-config.php)
 * 2. Acesse: http://seu-site.com/wordpress-generate-hash.php
 * 3. Copie o hash gerado
 * 4. DELETE este arquivo depois (por segurança)
 */

// Carregar WordPress
require_once('wp-load.php');

// Email e senha para testar
$email = 'edduardooo2011@hotmail.com';
$password = '@Nike2011@';

echo "<h1>🔐 Gerador de Hash WordPress</h1>\n\n";

// Buscar usuário
$user = get_user_by('email', $email);

if (!$user) {
    echo "<p style='color:red'>❌ Usuário não encontrado: $email</p>\n";
    exit;
}

echo "<h2>📊 Dados do Usuário</h2>\n";
echo "<pre>\n";
echo "ID: " . $user->ID . "\n";
echo "Email: " . $user->user_email . "\n";
echo "Login: " . $user->user_login . "\n";
echo "</pre>\n";

// Hash atual no banco
global $wpdb;
$current_hash = $wpdb->get_var($wpdb->prepare(
    "SELECT user_pass FROM $wpdb->users WHERE ID = %d",
    $user->ID
));

echo "<h2>🔑 Hash Atual no Banco</h2>\n";
echo "<pre>$current_hash</pre>\n";
echo "<p>Tamanho: " . strlen($current_hash) . " chars</p>\n";

// Testar senha atual
$check = wp_check_password($password, $current_hash, $user->ID);
echo "<h2>✅ Teste com Senha: <code>$password</code></h2>\n";
echo "<p style='color:" . ($check ? 'green' : 'red') . ";font-size:20px;font-weight:bold;'>";
echo $check ? "✅ SENHA CORRETA!" : "❌ SENHA INCORRETA";
echo "</p>\n";

// Gerar novo hash com a senha
$new_hash = wp_hash_password($password);
echo "<h2>🆕 Novo Hash Gerado</h2>\n";
echo "<pre>$new_hash</pre>\n";
echo "<p>Tamanho: " . strlen($new_hash) . " chars</p>\n";

// Testar novo hash
$check_new = wp_check_password($password, $new_hash, $user->ID);
echo "<h2>✅ Teste com Novo Hash</h2>\n";
echo "<p style='color:" . ($check_new ? 'green' : 'red') . ";font-size:20px;font-weight:bold;'>";
echo $check_new ? "✅ NOVO HASH VÁLIDO!" : "❌ NOVO HASH INVÁLIDO";
echo "</p>\n";

// Comparar hashes
echo "<h2>🔍 Comparação</h2>\n";
echo "<pre>\n";
echo "Hash atual: $current_hash\n";
echo "Novo hash:  $new_hash\n";
echo "Iguais?     " . ($current_hash === $new_hash ? 'SIM' : 'NÃO') . "\n";
echo "</pre>\n";

echo "<hr>\n";
echo "<h2>📋 PRÓXIMOS PASSOS:</h2>\n";
echo "<ol>\n";
echo "<li>Se o teste mostrou ✅ SENHA CORRETA, copie o <strong>Hash Atual</strong></li>\n";
echo "<li>Se mostrou ❌ SENHA INCORRETA mas você consegue fazer login, há um plugin modificando a autenticação</li>\n";
echo "<li>Use o hash correto no script de importação do Next.js</li>\n";
echo "<li><strong style='color:red;'>DELETE ESTE ARQUIVO AGORA!</strong></li>\n";
echo "</ol>\n";

echo "<hr>\n";
echo "<p style='color:red;font-weight:bold;'>⚠️ ATENÇÃO: Delete este arquivo após copiar os dados!</p>\n";
?>
