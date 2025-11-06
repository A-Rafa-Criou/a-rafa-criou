import { db } from '../src/lib/db';
import { files } from '../src/lib/db/schema';

async function fixFilePaths() {
  console.log('🔍 Verificando arquivos...\n');

  const allFiles = await db.select().from(files);

  console.log(`📊 Total de arquivos: ${allFiles.length}\n`);

  for (const file of allFiles) {
    console.log('📁 Arquivo:', {
      id: file.id,
      name: file.name,
      path: file.path,
      productId: file.productId,
      variationId: file.variationId,
    });

    // Verificar se tem espaços duplos ou caracteres problemáticos
    const hasDoubleSpaces = file.path.includes('  ');
    const hasSpecialChars = /[^\w\s./-]/.test(file.path);

    if (hasDoubleSpaces) {
      console.log('   ⚠️ ATENÇÃO: Caminho tem espaços duplos!');
    }
    if (hasSpecialChars) {
      console.log('   ⚠️ ATENÇÃO: Caminho tem caracteres especiais!');
    }

    console.log('');
  }

  console.log('✅ Verificação completa!');
}

fixFilePaths().catch(console.error);
