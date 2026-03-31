import { chat } from "/nos/ai/chat.js";

export const LANGUAGES = {
  en: "English",
  cn: "Chinese",
  "t-cn": "Traditional Chinese",
  ja: "Japanese",
  ko: "Korean",
  id: "Indonesian",
  vi: "Vietnamese",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  ru: "Russian",
  pl: "Polish",
  uk: "Ukrainian",
};

const extractTranslation = (content) => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const thinkMatch = content.match(thinkRegex);

  if (thinkMatch) {
    return content.replace(thinkRegex, "").trim();
  }

  return content;
};

let simple2traditionalLoadPromise = null;

export const translate = async (text, fromLang, targetLang, callback) => {
  if (fromLang === "cn" && targetLang === "t-cn") {
    if (!simple2traditionalLoadPromise) {
      simple2traditionalLoadPromise = (async () => {
        const module =
          await import("/npm/chinese-simple2traditional@2.2.2/dist/index.js");
        const { setupEnhance } =
          await import("/npm/chinese-simple2traditional@2.2.2/dist/enhance.js");
        setupEnhance();
        return module.simpleToTradition;
      })();
    }

    const simple2traditional = await simple2traditionalLoadPromise;
    const result = simple2traditional(text);
    if (callback) {
      callback({
        provider: "chinese-simple2traditional",
        id: "local",
        model: "local",
        chunk: result,
        content: result,
        done: true,
        isThinking: false,
      });
    }
    return;
  }

  const fromLanguage = LANGUAGES[fromLang] || fromLang;
  const targetLanguage = LANGUAGES[targetLang] || targetLang;

  const isSingleEnglishWordHeading = /^#+\s*[a-zA-Z]+\s*$/.test(text.trim());

  if (isSingleEnglishWordHeading && targetLang !== "en") {
    if (callback) {
      callback({
        provider: "none",
        id: "skip",
        model: "none",
        chunk: text,
        content: text,
        done: true,
        isThinking: false,
      });
    }
    return;
  }

  const messages = [
    {
      role: "system",
      content: `你是一个专业的翻译助手。请将用户提供的${fromLanguage}文本翻译为${targetLanguage}。
要求：
1. 严格保持原始文本的格式，包括换行、空格、缩进、标点符号等
2. 完整保留所有HTML标签、代码块标记（\`\`\`）、特殊字符（包括井号#、星号*、反引号等）
3. 如果原文包含代码块标记（\`\`\`），必须完整保留，不要删除或修改
4. 如果原文是不包含\`\`\`的纯HTML内容，翻译结果也不要添加\`\`\`标记
5. 不要在翻译结果外额外包裹代码块标记
6. 不要添加任何解释、注释或额外内容
7. 只返回翻译结果，不要包含任何额外说明`,
    },
    {
      role: "user",
      content: text,
    },
  ];

  return await chat(messages, {
    callback: ({ provider, id, model, chunk, content, done }) => {
      if (callback) {
        const translatedContent = extractTranslation(content);
        const isThinking =
          content.includes("<think>") && !content.includes("</think>");

        callback({
          provider,
          id,
          model,
          chunk,
          content: translatedContent,
          done,
          isThinking,
        });
      }
    },
  });
};
