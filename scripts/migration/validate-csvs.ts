/**
 * Script de Validação de CSVs
 *
 * Valida que os CSVs exportados estão corretos antes de importar
 *
 * Uso:
 *   npx tsx scripts/migration/validate-csvs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface ValidationResult {
  file: string;
  exists: boolean;
  rows: number;
  columns: string[];
  errors: string[];
  warnings: string[];
}

const expectedFiles = [
  {
    name: 'test-clientes.csv',
    requiredColumns: ['id', 'email', 'password_hash', 'name'],
    optionalColumns: ['phone', 'created_at', 'address', 'city', 'state', 'zipcode'],
  },
  {
    name: 'test-produtos.csv',
    requiredColumns: ['product_id', 'name', 'price'],
    optionalColumns: [
      'slug',
      'description',
      'short_description',
      'created_at',
      'sale_price',
      'sku',
      'categories',
    ],
  },
  {
    name: 'test-pedidos.csv',
    requiredColumns: ['order_id', 'customer_email', 'total'],
    optionalColumns: ['order_date', 'order_status', 'currency', 'payment_method'],
  },
  {
    name: 'test-order-items.csv',
    requiredColumns: ['order_id', 'product_id', 'quantity'],
    optionalColumns: ['item_id', 'product_name', 'variation_id', 'line_total'],
  },
];

function validateCSV(
  filePath: string,
  expectedColumns: string[],
  optionalColumns: string[]
): ValidationResult {
  const result: ValidationResult = {
    file: path.basename(filePath),
    exists: false,
    rows: 0,
    columns: [],
    errors: [],
    warnings: [],
  };

  // Verificar se arquivo existe
  if (!fs.existsSync(filePath)) {
    result.errors.push('Arquivo não encontrado');
    return result;
  }

  result.exists = true;

  try {
    // Ler arquivo
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse CSV
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    result.rows = records.length;

    if (records.length === 0) {
      result.errors.push('Arquivo vazio (sem registros)');
      return result;
    }

    // Obter colunas
    result.columns = Object.keys(records[0]);

    // Verificar colunas obrigatórias
    for (const col of expectedColumns) {
      if (!result.columns.includes(col)) {
        result.errors.push(`Coluna obrigatória ausente: ${col}`);
      }
    }

    // Verificar dados básicos
    for (const [index, record] of records.entries()) {
      for (const col of expectedColumns) {
        if (!record[col] || record[col].trim() === '') {
          result.warnings.push(`Linha ${index + 2}: coluna '${col}' vazia`);
        }
      }

      // Validação específica para emails
      if (result.file.includes('clientes') && record.email) {
        if (!record.email.includes('@')) {
          result.errors.push(`Linha ${index + 2}: email inválido: ${record.email}`);
        }
      }

      // Validação de preços
      if (record.price && isNaN(parseFloat(record.price))) {
        result.warnings.push(`Linha ${index + 2}: preço inválido: ${record.price}`);
      }

      if (record.total && isNaN(parseFloat(record.total))) {
        result.warnings.push(`Linha ${index + 2}: total inválido: ${record.total}`);
      }
    }
  } catch (error) {
    const err = error as Error;
    result.errors.push(`Erro ao ler arquivo: ${err.message}`);
  }

  return result;
}

function printResult(result: ValidationResult) {
  const icon = result.errors.length > 0 ? '❌' : result.warnings.length > 0 ? '⚠️' : '✅';

  console.log(`\n${icon} ${result.file}`);
  console.log('─'.repeat(60));

  if (!result.exists) {
    console.log('  Status: Não encontrado');
    return;
  }

  console.log(`  Registros:  ${result.rows}`);
  console.log(`  Colunas:    ${result.columns.length} (${result.columns.join(', ')})`);

  if (result.errors.length > 0) {
    console.log('\n  ❌ ERROS:');
    result.errors.forEach(err => console.log(`     • ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n  ⚠️  AVISOS:');
    result.warnings.slice(0, 5).forEach(warn => console.log(`     • ${warn}`));
    if (result.warnings.length > 5) {
      console.log(`     ... e mais ${result.warnings.length - 5} avisos`);
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('  ✅ Arquivo válido!');
  }
}

async function validateAll() {
  console.log('🔍 Validando CSVs de migração...\n');
  console.log('📂 Pasta: data/test/\n');

  const results: ValidationResult[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const fileConfig of expectedFiles) {
    const filePath = path.join('data', 'test', fileConfig.name);
    const result = validateCSV(filePath, fileConfig.requiredColumns, fileConfig.optionalColumns);
    results.push(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    printResult(result);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA VALIDAÇÃO');
  console.log('='.repeat(60));

  const filesFound = results.filter(r => r.exists).length;
  const filesValid = results.filter(r => r.errors.length === 0).length;

  console.log(`Arquivos encontrados:  ${filesFound}/${expectedFiles.length}`);
  console.log(`Arquivos válidos:      ${filesValid}/${expectedFiles.length}`);
  console.log(`Total de registros:    ${results.reduce((sum, r) => sum + r.rows, 0)}`);
  console.log(`Total de erros:        ${totalErrors}`);
  console.log(`Total de avisos:       ${totalWarnings}`);
  console.log('='.repeat(60));

  if (totalErrors > 0) {
    console.log('\n❌ Corrija os erros antes de importar!');
    console.log('   Consulte: EXPORTAR_WORDPRESS.md\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Há avisos, mas você pode prosseguir com a importação.');
    console.log('   Verifique se os dados estão corretos.\n');
  } else if (filesFound === expectedFiles.length) {
    console.log('\n✅ Todos os arquivos estão válidos!');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   npx tsx scripts/migration/import-customers.ts');
    console.log('   npx tsx scripts/migration/import-products.ts');
    console.log('   npx tsx scripts/migration/import-orders.ts\n');
  } else {
    console.log('\n⚠️  Alguns arquivos não foram encontrados.');
    console.log('   Exporte-os do WordPress primeiro!');
    console.log('   Consulte: EXPORTAR_WORDPRESS.md\n');
  }
}

validateAll().catch(console.error);
