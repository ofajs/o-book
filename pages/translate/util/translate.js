import { chat } from "/nos/ai/chat.js";

const languageMap = {
  cn: "Chinese",
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  ko: "Korean",
};

const extractTranslation = (content) => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const thinkMatch = content.match(thinkRegex);

  if (thinkMatch) {
    return content.replace(thinkRegex, "").trim();
  }

  return content;
};

export const translate = async (text, targetLang, callback) => {
  const targetLanguage = languageMap[targetLang] || targetLang;

  const isEnglishMarkdown = /^#.*\n[\s\S]/m.test(text);
  const isEnglishContent = /^[a-zA-Z\s.,!?;:'"()\[\]{}\-_+=\n\r]*$/.test(
    text.replace(/#.*\n/g, ""),
  );

  if (isEnglishMarkdown && isEnglishContent && targetLang !== "en") {
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
      content: `你是一个专业的翻译助手。请将用户提供的文本翻译为${targetLanguage}。
要求：
1. 严格保持原始文本的格式，包括换行、空格、缩进、标点符号等
2. 完整保留所有HTML标签、代码块、特殊字符（包括井号#、星号*、反引号等）
3. 不要添加任何markdown代码块标记（如\`\`\`html、\`\`\`等）
4. 不要添加任何解释、注释或额外内容
5. 只返回纯文本的翻译结果，不要包含任何格式化标记`,
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
