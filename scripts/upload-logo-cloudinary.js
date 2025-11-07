const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadLogo() {
  try {
    console.log('📤 Fazendo upload da logo para Cloudinary...');

    const logoPath = path.join(__dirname, '..', 'public', 'logo.webp');

    // Verificar se o arquivo existe
    if (!fs.existsSync(logoPath)) {
      throw new Error('Arquivo logo.webp não encontrado em public/');
    }

    console.log('✅ Arquivo encontrado:', logoPath);

    // Fazer upload
    const result = await cloudinary.uploader.upload(logoPath, {
      folder: 'a-rafa-criou/brand',
      public_id: 'logo',
      resource_type: 'image',
      overwrite: true, // Sobrescrever se já existir
      transformation: [
        {
          width: 500,
          height: 500,
          crop: 'limit',
          quality: 'auto:best',
          fetch_format: 'auto',
        },
      ],
    });

    console.log('\n🎉 Upload concluído com sucesso!\n');
    console.log('📋 Informações da imagem:');
    console.log('   - URL:', result.secure_url);
    console.log('   - Public ID:', result.public_id);
    console.log('   - Formato:', result.format);
    console.log('   - Tamanho:', result.bytes, 'bytes');
    console.log('   - Dimensões:', `${result.width}x${result.height}`);

    console.log('\n📝 Use esta URL no email:');
    console.log(`   ${result.secure_url}`);

    return result.secure_url;
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error.message);
    process.exit(1);
  }
}

// Executar
uploadLogo();
