import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

interface CsvRow {
  product_id: string;
  product_name: string;
  post_type: string;
  downloadable_files_json: string;
}

const csvPath = process.argv[2] || 'data/test/downloadable-files.csv';

console.log('🔍 Verificando estrutura do CSV...\n');

const csvContent = readFileSync(csvPath, 'utf-8');
const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

console.log(`📊 Total de linhas: ${rows.length}\n`);

// Mostrar primeiras 5 linhas
console.log('📋 Primeiras 5 linhas do CSV:\n');
for (let i = 0; i < Math.min(5, rows.length); i++) {
  const row = rows[i];
  console.log(`Linha ${i + 1}:`);
  console.log(`  product_id: "${row.product_id}" (tipo: ${typeof row.product_id})`);
  console.log(`  product_name: "${row.product_name}"`);
  console.log(`  post_type: "${row.post_type}"`);
  console.log(`  downloadable_files_json length: ${row.downloadable_files_json?.length || 0}`);
  console.log('');
}

// Estatísticas
const products = rows.filter(r => r.post_type === 'product');
const variations = rows.filter(r => r.post_type === 'product_variation');
const emptyIds = rows.filter(r => !r.product_id || r.product_id.trim() === '');

console.log('📊 Estatísticas:');
console.log(`  Tipo "product": ${products.length}`);
console.log(`  Tipo "product_variation": ${variations.length}`);
console.log(`  IDs vazios ou inválidos: ${emptyIds.length}`);

// Verificar colunas
console.log('\n📋 Colunas do CSV:');
if (rows.length > 0) {
  Object.keys(rows[0]).forEach(col => {
    console.log(`  - ${col}`);
  });
}
