# 📤 Exportação WordPress SEM cPanel

**Para quando você NÃO tem acesso ao cPanel**

---

## 🎯 MÉTODO 1: Plugin WP All Export (RECOMENDADO)

### Passo 1: Instalar Plugin

1. Acesse: `https://arafacriou.com.br/wp-admin/plugin-install.php`
2. Busque: **"WP All Export"**
3. Clique: **Instalar Agora** → **Ativar**

### Passo 2: Exportar Clientes

1. Vá em: **Todas as Exportações** → **Nova Exportação**
2. Selecione: **Users**
3. Clique: **Customize Export File**
4. Arraste os campos necessários:
   - User ID
   - User Email
   - User Password (hash)
   - Display Name
   - User Registered
   - Billing Phone
   - Billing Address
   - Billing City
   - Billing State
   - Billing Postcode

5. Configure:
   - **File Type:** CSV
   - **Delimiter:** Comma
   - **Encoding:** UTF-8

6. Clique: **Confirm & Run Export**
7. Baixe o arquivo
8. Renomeie para: `test-clientes.csv`
9. Coloque em: `data/test/test-clientes.csv`

### Passo 3: Exportar Produtos

1. **Nova Exportação** → **WooCommerce Products**
2. Campos necessários:
   - Product ID
   - Product Title
   - Product Slug
   - Product Description
   - Short Description
   - Regular Price
   - Sale Price
   - SKU
   - Stock Status
   - Categories

3. Exporte e salve como: `test-produtos.csv`

### Passo 4: Exportar Pedidos

1. **Nova Exportação** → **WooCommerce Orders**
2. Campos necessários:
   - Order ID
   - Order Date
   - Order Status
   - Billing Email
   - Order Total
   - Currency
   - Payment Method
   - Customer User ID

3. Exporte e salve como: `test-pedidos.csv`

---

## 🎯 MÉTODO 2: Via FTP + Script PHP

Se você tem acesso FTP, podemos criar um script PHP temporário que exporta os dados.

### Passo 1: Criar arquivo PHP

Crie o arquivo `export-data.php` com este conteúdo:

```php
<?php
/**
 * Script de Exportação de Dados - A Rafa Criou
 * ATENÇÃO: Delete este arquivo após usar!
 */

// Carrega o WordPress
require_once('wp-load.php');

// Configura headers para download CSV
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=export-' . $_GET['type'] . '.csv');

// Abre output stream
$output = fopen('php://output', 'w');

// Define tipo de exportação
$type = $_GET['type'] ?? 'customers';

switch ($type) {
    case 'customers':
        exportCustomers($output);
        break;
    case 'products':
        exportProducts($output);
        break;
    case 'orders':
        exportOrders($output);
        break;
    case 'downloads':
        exportDownloads($output);
        break;
}

fclose($output);

// Função: Exportar Clientes
function exportCustomers($output) {
    // Cabeçalhos
    fputcsv($output, [
        'id', 'email', 'password_hash', 'name', 'created_at', 
        'phone', 'address', 'city', 'state', 'zipcode'
    ]);
    
    // Query usuários
    $users = get_users(['number' => 20, 'orderby' => 'registered', 'order' => 'DESC']);
    
    foreach ($users as $user) {
        fputcsv($output, [
            $user->ID,
            $user->user_email,
            $user->user_pass, // Hash WordPress
            $user->display_name,
            $user->user_registered,
            get_user_meta($user->ID, 'billing_phone', true),
            get_user_meta($user->ID, 'billing_address_1', true),
            get_user_meta($user->ID, 'billing_city', true),
            get_user_meta($user->ID, 'billing_state', true),
            get_user_meta($user->ID, 'billing_postcode', true),
        ]);
    }
}

// Função: Exportar Produtos
function exportProducts($output) {
    fputcsv($output, [
        'product_id', 'name', 'slug', 'description', 'short_description',
        'created_at', 'price', 'sale_price', 'sku', 'stock_status', 'categories'
    ]);
    
    $args = [
        'post_type' => 'product',
        'posts_per_page' => 10,
        'orderby' => 'date',
        'order' => 'DESC'
    ];
    
    $products = get_posts($args);
    
    foreach ($products as $product) {
        $product_obj = wc_get_product($product->ID);
        
        // Pega categorias
        $categories = wp_get_post_terms($product->ID, 'product_cat', ['fields' => 'names']);
        $categories_str = implode('|', $categories);
        
        fputcsv($output, [
            $product->ID,
            $product->post_title,
            $product->post_name,
            $product->post_content,
            $product->post_excerpt,
            $product->post_date,
            $product_obj->get_regular_price(),
            $product_obj->get_sale_price(),
            $product_obj->get_sku(),
            $product_obj->get_stock_status(),
            $categories_str
        ]);
    }
}

// Função: Exportar Pedidos
function exportOrders($output) {
    fputcsv($output, [
        'order_id', 'order_date', 'order_status', 'customer_email',
        'total', 'currency', 'payment_method', 'payment_method_title', 'user_id'
    ]);
    
    $args = [
        'limit' => 20,
        'orderby' => 'date',
        'order' => 'DESC',
        'status' => ['completed', 'processing']
    ];
    
    $orders = wc_get_orders($args);
    
    foreach ($orders as $order) {
        fputcsv($output, [
            $order->get_id(),
            $order->get_date_created()->date('Y-m-d H:i:s'),
            $order->get_status(),
            $order->get_billing_email(),
            $order->get_total(),
            $order->get_currency(),
            $order->get_payment_method(),
            $order->get_payment_method_title(),
            $order->get_user_id()
        ]);
    }
}

// Função: Exportar Downloads
function exportDownloads($output) {
    global $wpdb;
    
    fputcsv($output, [
        'download_id', 'user_id', 'user_email', 'product_id', 
        'order_id', 'downloads_remaining', 'access_expires', 'download_count'
    ]);
    
    $results = $wpdb->get_results("
        SELECT * FROM {$wpdb->prefix}woocommerce_downloadable_product_permissions
        WHERE (downloads_remaining != '0' OR downloads_remaining IS NULL)
        LIMIT 50
    ");
    
    foreach ($results as $row) {
        fputcsv($output, [
            $row->download_id,
            $row->user_id,
            $row->user_email,
            $row->product_id,
            $row->order_id,
            $row->downloads_remaining,
            $row->access_expires,
            $row->download_count
        ]);
    }
}
?>
```

### Passo 2: Fazer Upload via FTP

1. Use FileZilla, WinSCP ou o gerenciador de arquivos da hospedagem
2. Conecte ao servidor FTP
3. Navegue até a pasta raiz do WordPress (onde está `wp-config.php`)
4. Faça upload do arquivo `export-data.php`

### Passo 3: Executar Script

Acesse as URLs para baixar cada CSV:

1. **Clientes:**
   ```
   https://arafacriou.com.br/export-data.php?type=customers
   ```
   Salve como: `test-clientes.csv`

2. **Produtos:**
   ```
   https://arafacriou.com.br/export-data.php?type=products
   ```
   Salve como: `test-produtos.csv`

3. **Pedidos:**
   ```
   https://arafacriou.com.br/export-data.php?type=orders
   ```
   Salve como: `test-pedidos.csv`

4. **Downloads:**
   ```
   https://arafacriou.com.br/export-data.php?type=downloads
   ```
   Salve como: `test-downloads.csv`

### Passo 4: IMPORTANTE - Segurança

**DEPOIS de exportar tudo, DELETE o arquivo `export-data.php` do servidor!**

Via FTP ou pelo painel de arquivos da hospedagem.

---

## 🎯 MÉTODO 3: Pedir ao Suporte da Hospedagem

Se nenhum método acima funcionar:

1. Abra chamado no suporte da hospedagem
2. Peça acesso ao **phpMyAdmin** ou ao **cPanel**
3. Ou peça que eles exportem as tabelas do banco para você:
   - `wp_users`
   - `wp_usermeta`
   - `wp_posts` (produtos e pedidos)
   - `wp_postmeta`
   - `wp_woocommerce_order_items`
   - `wp_woocommerce_order_itemmeta`
   - `wp_woocommerce_downloadable_product_permissions`

---

## 🎯 MÉTODO 4: Plugin Database Backup

### Alternativa mais simples:

1. Instale: **"WP Database Backup"**
2. Vá em: **Tools** → **Database Backup**
3. Selecione todas as tabelas do WooCommerce
4. Baixe o backup SQL
5. **Me envie o arquivo** e eu extraio os CSVs para você

---

## 📊 Qual método você prefere?

- ✅ **Método 1:** Mais fácil, mas precisa instalar plugin
- ✅ **Método 2:** Mais técnico, mas funciona sempre
- ✅ **Método 3:** Depende do suporte
- ✅ **Método 4:** Backup completo (mais seguro)

**Escolha um e me avise qual dúvida tem!**

---

## ✅ Próximos Passos

Depois de ter os CSVs:

1. Coloque em: `data/test/`
2. Valide: `npx tsx scripts/migration/validate-csvs.ts`
3. Importe: `npx tsx scripts/migration/import-customers.ts`

---

## 🔒 Segurança

- ⚠️ NUNCA compartilhe arquivos com senhas
- ⚠️ Delete scripts PHP temporários
- ⚠️ Faça backup antes de tudo
- ⚠️ Teste primeiro com poucos registros
