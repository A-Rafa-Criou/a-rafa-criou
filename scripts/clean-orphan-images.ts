/**
 * Script para limpar imagens órfãs (que não existem mais no Cloudinary)
 * Verifica cada imagem no banco e remove se retornar 404
 */

import { db } from '@/lib/db'
import { productImages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    return false
  }
}

async function cleanOrphanImages() {
  console.log('🔍 Buscando todas as imagens no banco...\n')

  const allImages = await db
    .select()
    .from(productImages)
    .where(eq(productImages.url, productImages.url)) // Buscar todas

  console.log(`📊 Total de imagens encontradas: ${allImages.length}\n`)

  let checkedCount = 0
  let deletedCount = 0
  const imagesToDelete: string[] = []

  for (const image of allImages) {
    checkedCount++
    
    if (!image.url) {
      console.log(`⚠️  [${checkedCount}/${allImages.length}] Imagem sem URL (ID: ${image.id})`)
      imagesToDelete.push(image.id)
      continue
    }

    const exists = await checkImageExists(image.url)
    
    if (!exists) {
      console.log(`❌ [${checkedCount}/${allImages.length}] 404 - ${image.url}`)
      imagesToDelete.push(image.id)
    } else {
      console.log(`✅ [${checkedCount}/${allImages.length}] OK  - ${image.url}`)
    }

    // Pequeno delay para não sobrecarregar o Cloudinary
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📋 Resumo:`)
  console.log(`   Total verificado: ${checkedCount}`)
  console.log(`   Imagens órfãs encontradas: ${imagesToDelete.length}`)

  if (imagesToDelete.length > 0) {
    console.log(`\n🗑️  Removendo ${imagesToDelete.length} imagens órfãs do banco...`)
    
    for (const imageId of imagesToDelete) {
      await db.delete(productImages).where(eq(productImages.id, imageId))
      deletedCount++
    }

    console.log(`✅ ${deletedCount} imagens removidas com sucesso!\n`)
  } else {
    console.log(`\n✨ Nenhuma imagem órfã encontrada! Tudo limpo.\n`)
  }
}

cleanOrphanImages()
  .then(() => {
    console.log('✅ Script finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
