const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'product-detail-enhanced.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Substituir os 3 parágrafos legais
const replacements = [
  {
    old: 'Esse arquivo é protegido pela LEI Nº 9.610, DE 19 DE FEVEREIRO DE 1998. O crime de violação de direito autoral está previsto no art. 184 do Código Penal, que preceitua: "Violar direitos de autor e os que lhe são conexos: Pena – detenção, de 3 meses a 1 ano, ou multa".',
    new: "{t('productInfo.copyrightLaw')}"
  },
  {
    old: 'Arquivo exclusivo DIGITAL para IMPRESSÃO feito somente para USO PESSOAL. Necessário fazer download e salvar no google drive. Após a confirmação de pagamento, o arquivo ficará disponível para Download no email cadastrado na hora da compra ou aqui mesmo no site: (Área do cliente &gt; Downloads)',
    new: "{t('productInfo.digitalFileNotice')}"
  },
  {
    old: 'Esse arquivo é protegido pela LEI N° 9.610, DE 19 DE FEVEREIRO DE 1998. AUTORIZADO APENAS PARA USO PESSOAL. Enviar o arquivo para outras pessoas por email, whatsapp ou qualquer outro meio eletrônico é PROIBIDO. A cópia desse arquivo ou impressão com fins comerciais também NÃO é autorizada.',
    new: "{t('productInfo.personalUseOnly')}"
  }
];

replacements.forEach(({old, new: newText}) => {
  if (content.includes(old)) {
    content = content.replace(old, newText);
    console.log(`✅ Substituído: ${old.substring(0, 50)}...`);
  } else {
    console.log(`❌ NÃO encontrado: ${old.substring(0, 50)}...`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Arquivo atualizado com sucesso!');
