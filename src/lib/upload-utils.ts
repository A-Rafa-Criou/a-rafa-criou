/**
 * Upload direto para R2 (sem passar pelo backend)
 * Usa URL assinada para PUT direto no bucket
 */
export async function uploadDirectToR2(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ key: string; url: string }> {
  try {
    // 1. Gerar URL assinada no backend
    const signatureRes = await fetch('/api/r2/generate-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!signatureRes.ok) {
      throw new Error('Failed to generate upload URL');
    }

    const { uploadUrl, fileKey } = await signatureRes.json();

    // 2. Upload direto para R2 usando XMLHttpRequest (suporta progress)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            key: fileKey,
            url: uploadUrl.split('?')[0], // Remove query params
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // PUT request para R2
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    console.error('Error in uploadDirectToR2:', error);
    throw error;
  }
}

/**
 * Upload direto para Cloudinary (sem passar pelo backend)
 * Usa SDK JS do Cloudinary
 */
export async function uploadDirectToCloudinary(
  file: File | string,
  folder: 'products' | 'variations' = 'products',
  onProgress?: (progress: number) => void
): Promise<{ publicId: string; url: string; secureUrl: string }> {
  try {
    // 1. Gerar assinatura no backend
    const signatureRes = await fetch('/api/cloudinary/generate-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });

    if (!signatureRes.ok) {
      throw new Error('Failed to generate Cloudinary signature');
    }

    const {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: folderPath,
    } = await signatureRes.json();

    // 2. Upload direto para Cloudinary usando XMLHttpRequest
    return new Promise((resolve, reject) => {
      const formData = new FormData();

      if (typeof file === 'string') {
        // Base64 string
        formData.append('file', file);
      } else {
        // File object
        formData.append('file', file);
      }

      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folderPath);

      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);

          // ⚡ GARANTIR que URLs sempre apontem para .webp (independente do formato original)
          const normalizeToWebp = (url: string) => {
            if (!url) return url;
            // Substituir extensão da imagem por .webp
            return url.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
          };

          resolve({
            publicId: response.public_id,
            url: normalizeToWebp(response.url),
            secureUrl: normalizeToWebp(response.secure_url),
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // POST para Cloudinary
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error in uploadDirectToCloudinary:', error);
    throw error;
  }
}

/**
 * Comprime imagem antes do upload
 * @param file - Arquivo de imagem original
 * @param maxWidth - Largura máxima (padrão: 800px)
 * @param quality - Qualidade JPEG 0-1 (padrão: 0.75)
 * @returns File comprimido
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.75
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar mantendo aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
