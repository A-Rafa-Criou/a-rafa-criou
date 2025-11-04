/**
 * Funções para Verificação de Senha WordPress (phpass)
 * 
 * O WordPress usa o algoritmo phpass para hash de senhas.
 * Este arquivo implementa a verificação compatível para
 * permitir login com senhas antigas durante a migração.
 * 
 * Após login bem-sucedido, a senha é automaticamente
 * convertida para bcrypt (mais seguro).
 */

import crypto from 'crypto';

/**
 * Caracteres usados no encoding phpass
 */
const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Codifica bytes para string base64 phpass
 */
function encode64(input: Buffer, count: number): string {
  let output = '';
  let i = 0;

  do {
    let value = input[i++];
    output += ITOA64[value & 0x3f];

    if (i < count) {
      value |= input[i] << 8;
    }

    output += ITOA64[(value >> 6) & 0x3f];

    if (i++ >= count) {
      break;
    }

    if (i < count) {
      value |= input[i] << 16;
    }

    output += ITOA64[(value >> 12) & 0x3f];

    if (i++ >= count) {
      break;
    }

    output += ITOA64[(value >> 18) & 0x3f];
  } while (i < count);

  return output;
}

/**
 * Cria hash MD5 iterativo (crypt_private do phpass)
 */
function cryptPrivate(password: string, setting: string): string {
  const output = '*0';

  if (setting.substring(0, 2) !== output) {
    const output2 = '*1';
    if (setting.substring(0, 3) !== output2) {
      return output;
    }
  }

  const countLog2 = ITOA64.indexOf(setting[3]);
  if (countLog2 < 7 || countLog2 > 30) {
    return output;
  }

  let count = 1 << countLog2;
  const salt = setting.substring(4, 12);

  if (salt.length !== 8) {
    return output;
  }

  let hash = crypto.createHash('md5').update(salt + password).digest();

  do {
    hash = crypto.createHash('md5').update(Buffer.concat([hash, Buffer.from(password)])).digest();
  } while (--count);

  const result = setting.substring(0, 12) + encode64(hash, 16);
  
  return result;
}

/**
 * Verifica se uma senha corresponde ao hash phpass do WordPress
 * 
 * @param password - Senha em texto plano
 * @param hash - Hash phpass do WordPress (formato: $P$B...)
 * @returns true se a senha estiver correta
 * 
 * @example
 * const isValid = verifyWordPressPassword('minhasenha123', '$P$B1234567890...');
 * if (isValid) {
 *   // Senha correta! Converter para bcrypt
 * }
 */
export function verifyWordPressPassword(password: string, hash: string): boolean {
  // Validar formato do hash
  if (!hash || hash.length !== 34) {
    return false;
  }

  // WordPress usa $P$ ou $H$ (phpass portable)
  if (!hash.startsWith('$P$') && !hash.startsWith('$H$')) {
    return false;
  }

  const hashedPassword = cryptPrivate(password, hash);
  
  return hashedPassword === hash;
}

/**
 * Verifica se um hash é do tipo WordPress/phpass
 * 
 * @param hash - Hash a ser verificado
 * @returns true se for hash WordPress
 */
export function isWordPressHash(hash: string): boolean {
  return hash.startsWith('$P$') || hash.startsWith('$H$');
}

/**
 * EXEMPLO DE USO
 * 
 * import { verifyWordPressPassword } from '@/lib/auth/wordpress-password';
 * 
 * // No authorize() do Auth.js:
 * if (dbUser.legacyPasswordType === 'wordpress_phpass') {
 *   const isValid = verifyWordPressPassword(
 *     credentials.password, 
 *     dbUser.legacyPasswordHash
 *   );
 *   
 *   if (isValid) {
 *     // Converter para bcrypt
 *     const bcryptHash = await bcrypt.hash(credentials.password, 10);
 *     await db.update(users).set({
 *       password: bcryptHash,
 *       legacyPasswordHash: null,
 *       legacyPasswordType: null,
 *     }).where(eq(users.id, dbUser.id));
 *   }
 * }
 */
