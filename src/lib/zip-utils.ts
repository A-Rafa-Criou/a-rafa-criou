import JSZip from 'jszip';
import { getR2SignedUrl, uploadToR2 } from './r2-utils';

interface FileToZip {
  path: string;
  originalName: string;
}

/**
 * Gera um arquivo ZIP com múltiplos PDFs do R2 e retorna o buffer
 */
export async function createZipFromR2Files(files: FileToZip[]): Promise<Buffer> {
  const zip = new JSZip();

  // Baixar cada arquivo do R2 e adicionar ao ZIP
  await Promise.all(
    files.map(async file => {
      try {
        // Gerar URL assinada temporária (15 min é suficiente para download)
        const signedUrl = await getR2SignedUrl(file.path, 15 * 60);

        // Fazer download do arquivo
        const response = await fetch(signedUrl);
        if (!response.ok) {
          console.error(`Erro ao baixar arquivo ${file.originalName}:`, response.statusText);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Adicionar ao ZIP com nome original
        zip.file(file.originalName, buffer);
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.originalName}:`, error);
      }
    })
  );

  // Gerar o ZIP
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return zipBuffer;
}

/**
 * Faz upload do ZIP para o R2 e retorna a URL assinada
 */
export async function uploadZipToR2AndGetUrl(
  zipBuffer: Buffer,
  zipFileName: string
): Promise<string> {
  const key = `zips/${Date.now()}-${zipFileName}`;

  // Upload do ZIP usando a função existente de upload
  await uploadToR2(key, zipBuffer, 'application/zip');

  // Gerar URL assinada para o ZIP (24 horas)
  const zipUrl = await getR2SignedUrl(key, 24 * 60 * 60);

  return zipUrl;
}
