import { db } from '../src/lib/db'
import { files } from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'
import { r2, R2_BUCKET } from '../src/lib/r2'
import { ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'

function normalizePath(path: string): string {
  return path
    .replace(/\s+/g, ' ') // Múltiplos espaços → 1 espaço
    .replace(/\.\.pdf$/, '.pdf') // ..pdf → .pdf
    .trim()
}

async function listR2Files(prefix: string) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    })
    const response = await r2.send(command)
    return response.Contents || []
  } catch (error) {
    console.error('❌ Erro ao listar arquivos R2:', error)
    return []
  }
}

async function checkFileExists(key: string): Promise<boolean> {
  try {
    await r2.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    )
    return true
  } catch {
    return false
  }
}

async function fixFilePaths() {
  console.log('🔍 Verificando e corrigindo caminhos de arquivos...\n')
  console.log('📦 Bucket:', R2_BUCKET, '\n')

  const allFiles = await db.select().from(files)

  for (const file of allFiles) {
    console.log('📁', file.name)
    console.log('   Caminho atual:', file.path)

    // Verificar se o arquivo existe com o caminho atual
    const existsCurrent = await checkFileExists(file.path)
    console.log('   Existe no R2 (atual):', existsCurrent ? '✅' : '❌')

    if (!existsCurrent) {
      // Tentar caminho normalizado
      const normalizedPath = normalizePath(file.path)
      console.log('   Caminho normalizado:', normalizedPath)

      const existsNormalized = await checkFileExists(normalizedPath)
      console.log('   Existe no R2 (normalizado):', existsNormalized ? '✅' : '❌')

      if (existsNormalized) {
        // Atualizar no banco
        console.log('   🔄 Atualizando caminho no banco...')
        await db
          .update(files)
          .set({ path: normalizedPath })
          .where(eq(files.id, file.id))
        console.log('   ✅ Caminho atualizado!')
      } else {
        // Listar arquivos na pasta para ver o que existe
        const prefix = file.path.substring(0, file.path.lastIndexOf('/'))
        console.log('   📂 Listando arquivos em:', prefix)
        const r2Files = await listR2Files(prefix)
        if (r2Files.length > 0) {
          console.log('   Arquivos encontrados no R2:')
          r2Files.forEach(f => console.log('      -', f.Key))
        } else {
          console.log('   ❌ Nenhum arquivo encontrado nesta pasta no R2')
        }
      }
    }

    console.log('')
  }

  console.log('✅ Verificação completa!')
}

fixFilePaths().catch(console.error)
