import CryptoJS from 'crypto-js';

/**
 * AES ECB 解密（用于解密密钥）
 */
export function aesDecrypt(encryptedData: string, aesKey: string): string {
  try {
    const key = CryptoJS.enc.Utf8.parse(aesKey);
    const encrypted = CryptoJS.enc.Hex.parse(encryptedData);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        key,
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7,
        }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('AES解密失败:', error);
    throw new Error('AES解密失败');
  }
}

/**
 * 3DES ECB 加密（用于加密请求体）
 */
export function desedeEncrypt(plainText: string, secretKey: string): string {
  try {
    // 处理密钥长度：16位补齐到24位
    const processedKey = processKeyLength(secretKey);

    const key = CryptoJS.enc.Utf8.parse(processedKey);
    const encrypted = CryptoJS.TripleDES.encrypt(plainText, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.ZeroPadding,
    });

    return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
  } catch (error) {
    console.error('3DES加密失败:', error);
    throw new Error('3DES加密失败');
  }
}

/**
 * 3DES ECB 解密（用于解密响应）
 */
export function desedeDecrypt(encryptedData: string, secretKey: string): string {
  try {
    // 处理密钥长度
    const processedKey = processKeyLength(secretKey);

    const key = CryptoJS.enc.Utf8.parse(processedKey);
    const encryptedHex = CryptoJS.enc.Hex.parse(encryptedData);
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: encryptedHex,
    });

    const decrypted = CryptoJS.TripleDES.decrypt(encrypted, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.ZeroPadding,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('3DES解密失败:', error);
    throw new Error('3DES解密失败');
  }
}

/**
 * 处理3DES密钥长度
 */
function processKeyLength(key: string): string {
  if (key.length === 16) {
    return key + key.substring(0, 8);
  } else if (key.length === 24) {
    return key;
  } else {
    throw new Error('错误的密钥长度，3DES密钥长度必须为16或24位');
  }
}

/**
 * 生成MD5签名
 */
export function generateMd5Sign(data: string, key: string): string {
  const signData = `${data}&${key}`;
  return CryptoJS.MD5(signData).toString();
}

/**
 * 验证MD5签名
 */
export function verifyMd5Sign(data: string, key: string, receivedSign: string): boolean {
  const expectedSign = generateMd5Sign(data, key);
  return expectedSign === receivedSign;
}
