/**
 * 判断单个字符是否为中文字符（CJK 统一表意汉字）
 * @param {string} ch - 单个字符（可正确处理 Unicode 代理对）
 * @returns {boolean} - 是中文字符返回 true，否则返回 false
 */
function isChineseChar(ch) {
  if (!ch || ch.length === 0) return false;
  const code = ch.codePointAt(0);

  // 〇（U+3007）是中文常用汉字，单独加入
  if (code === 0x3007) return true;

  // CJK 统一表意文字及其扩展（不含兼容汉字，以排除日韩特有字符）
  return (
    // 基本区
    (code >= 0x4e00 && code <= 0x9fff) ||
    // 扩展 A
    (code >= 0x3400 && code <= 0x4dbf) ||
    // 扩展 B
    (code >= 0x20000 && code <= 0x2a6df) ||
    // 扩展 C
    (code >= 0x2a700 && code <= 0x2b73f) ||
    // 扩展 D
    (code >= 0x2b740 && code <= 0x2b81f) ||
    // 扩展 E
    (code >= 0x2b820 && code <= 0x2ceaf) ||
    // 扩展 F
    (code >= 0x2ceb0 && code <= 0x2ebe0) ||
    // 扩展 G
    (code >= 0x30000 && code <= 0x3134a)
  );
}

/**
 * 判断字符串是否包含中文字符
 * @param {string} str - 待检测字符串
 * @returns {boolean} - 包含任意中文字符返回 true，否则 false
 */
function hasChinese(str) {
  if (!str) return false;
  for (const ch of str) {
    if (isChineseChar(ch)) return true;
  }
  return false;
}

/**
 * 提取字符串中的所有中文字符
 * @param {string} str - 待提取字符串
 * @returns {string[]} - 中文字符数组
 */
function getAllChinese(str) {
  const result = [];
  for (const ch of str) {
    if (isChineseChar(ch)) result.push(ch);
  }
  return result;
}

export const ChineseChecker = {
  isChinese: isChineseChar,
  hasChinese: hasChinese,
  getAllChinese: getAllChinese,
};
