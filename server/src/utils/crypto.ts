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

    // 调试：打印解密结果hex
    console.log('[3DES] 解密结果(hex):', decrypted.toString());
    console.log('[3DES] 解密结果sigBytes:', decrypted.sigBytes);

    // ZeroPadding 会在末尾保留 \0 空字节，直接做 UTF-8 转码可能报 "Malformed UTF-8 data"
    // 改用 Latin1（每字节直映一个字符），再去除尾部空字节
    try {
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch {
      // 回退：Latin1 永不会抛错
      const result = decrypted.toString(CryptoJS.enc.Latin1);
      return result.replace(/\0+$/, '');
    }
  } catch (error) {
    console.error('3DES解密失败:', error);
    throw new Error('3DES解密失败');
  }
}

/**
 * 合利宝通知 - 3DES ECB Base64 解密
 *
 * 官方 Demo 流程：
 *   1. data 字段是标准 Base64 编码（不是 Hex！）
 *   2. Base64 解码后的字节 → 3DES ECB ZeroPadding 解密
 *   3. 密钥处理：hutool 的 SecureUtil.desede(key.getBytes()) 自动处理非标准长度
 *      Node.js 侧：参考 hutool 行为，对 16 字节复制前 8 字节，其余补齐到 24
 *
 * @param base64Data  通知报文的 data 字段（Base64 字符串）
 * @param notifyKey   通知解密密钥（UTF-8 字节为有效载荷）
 */
export function desedeDecryptNotify(base64Data: string, notifyKey: string): string {
  console.log('[3DES-Notify] 输入 data 长度:', base64Data.length);

  // 1. Base64 解码
  const cipherWords = CryptoJS.enc.Base64.parse(base64Data);
  console.log('[3DES-Notify] Base64 解码后 sigBytes:', cipherWords.sigBytes);

  // 2. 密钥补齐到 24 字节（参照 hutool Behavior）
  const keyBytes = prepareNotifyKey(notifyKey);

  // 3. 3DES ECB ZeroPadding 解密
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: cipherWords });
  const decrypted = CryptoJS.TripleDES.decrypt(cipherParams, keyBytes, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.ZeroPadding,
  });

  console.log('[3DES-Notify] 解密结果(hex):', decrypted.toString());
  console.log('[3DES-Notify] 解密结果 sigBytes:', decrypted.sigBytes);

  try {
    const utf8 = decrypted.toString(CryptoJS.enc.Utf8);
    // 去除 ZeroPadding 尾部的 \0
    return utf8.replace(/\0+$/, '');
  } catch {
    const latin1 = decrypted.toString(CryptoJS.enc.Latin1);
    return latin1.replace(/\0+$/, '');
  }
}

/**
 * 将通知密钥处理为 24 字节 3DES key（WordArray）
 *
 * hutool SecureUtil.desede(key.getBytes()) 对非标准长度密钥的行为：
 * - key 长度 < 16：补 \0 到 16，再复制前 8 字节到 24
 * - key 长度 16：复制前 8 字节 → 24
 * - key 长度 17~23：补 \0 到 24
 * - key 长度 = 24：直接使用
 * - key 长度 > 24：截取前 24
 */
function prepareNotifyKey(notifyKey: string): CryptoJS.lib.WordArray {
  let padded: string;
  const len = notifyKey.length;
  console.log('[3DES-Notify] 原始密钥长度:', len);

  if (len === 24) {
    padded = notifyKey;
  } else if (len === 16) {
    padded = notifyKey + notifyKey.substring(0, 8);
  } else if (len < 16) {
    const k16 = notifyKey.padEnd(16, '\0');
    padded = k16 + k16.substring(0, 8);
  } else if (len < 24) {
    padded = notifyKey.padEnd(24, '\0');
  } else {
    padded = notifyKey.substring(0, 24);
  }

  console.log('[3DES-Notify] 补齐后密钥长度:', padded.length);
  return CryptoJS.enc.Utf8.parse(padded);
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
 * 合利宝通知 RSA-MD5 验签
 *
 * 官方 Demo 流程（与直觉不同！）：
 *   1. 验签原文 = 通知报文中原始的 Base64 data 字段（未解密）
 *   2. 签名算法 = MD5withRSA（不是 SHA256！）
 *   3. 签名字段 = sign（Base64 编码）
 *
 * @param rawBase64Data  通知报文的 data 字段原文（Base64 字符串，不要先解密）
 * @param publicKeyPem   合利宝公钥 PEM 格式
 * @param signBase64     通知报文的 sign 字段（Base64 编码的签名值）
 */
export function rsaMd5VerifySign(rawBase64Data: string, publicKeyPem: string, signBase64: string): boolean {
  try {
    const crypto = require('crypto');
    const verify = crypto.createVerify('RSA-MD5');
    verify.update(rawBase64Data, 'utf8');
    const result = verify.verify(publicKeyPem, signBase64, 'base64');
    if (!result) {
      console.error('[RSA-MD5] 验签失败');
    }
    return result;
  } catch (error) {
    console.error('[RSA-MD5] 验签异常:', error);
    return false;
  }
}

/**
 * RSA SHA256 验签（保留，用于其他场景）
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
