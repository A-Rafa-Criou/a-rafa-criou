import { db } from '../src/lib/db'
import { products } from '../src/lib/db/schema'

async function checkProduct() {
  try {
    // Pegar o primeiro produto para testar
    const [product] = await db.select().from(products).limit(1)
    
    if (!product) {
      console.log('❌ Nenhum produto encontrado')
      return
    }

    console.log('📦 Produto:', product.name)
    console.log('🏷️  ID:', product.id)
    console.log('📄 fileType:', product.fileType)
    console.log('✅ Valor no banco:', product.fileType === 'pdf' ? 'PDF' : 'PNG')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    process.exit(0)
  }
}

checkProduct()
