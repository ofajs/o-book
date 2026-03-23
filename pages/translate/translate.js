import { chat } from "/nos/ai/chat.js";

export const translate = async (text, targetLang, callback) => {
  const messages = [
    {
      role: "system",
      content: `你是一个专业的翻译助手。请将用户提供的文本翻译为${targetLang}。只返回翻译结果，不要添加任何解释或额外内容。`,
    },
    {
      role: "user",
      content: text,
    },
  ];

  return await chat(messages, {
    callback: ({ provider, chunk, content, done }) => {
      if (callback) {
        callback({ provider, chunk, content, done });
      }
    },
  });
};
