import CryptoJS from 'crypto-js';

/**
 * AES ECB 解密（用于解密密钥）
 */
export function aesDecrypt(encryptedData: string, aesKey: string): string {
  try {
    console.log('[AES] 密文(hex):', encryptedData);
    console.log('[AES] 密文长度:', encryptedData.length, '字符,', encryptedData.length / 2, '字节');
    console.log('[AES] AES密钥(字符串):', aesKey);
    console.log('[AES] AES密钥长度:', aesKey.length, '字符 → 按UTF-8解析为', aesKey.length, '字节 (AES-' + aesKey.length * 8 + ')');

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
    // 调试：打印解密结果的hex
    console.log('[AES] 解密结果(hex):', decrypted.toString());
    console.log('[AES] 解密结果sigBytes:', decrypted.sigBytes);
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

/**
 * RSA SHA256 验签（用于小利云通知回调）
 * @param data 待验签的原文（解密后的JSON字符串）
 * @param publicKeyPem 合利宝公钥 PEM 格式
 * @param signBase64 签名值 Base64 编码
 */
export function rsaVerifySign(data: string, publicKeyPem: string, signBase64: string): boolean {
  try {
    const crypto = require('crypto');
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data, 'utf8');
    return verify.verify(publicKeyPem, signBase64, 'base64');
  } catch (error) {
    console.error('[RSA] 验签失败:', error);
    return false;
  }
}
