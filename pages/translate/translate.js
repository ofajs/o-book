import { chat } from "/nos/ai/chat.js";

export const translate = async (text, targetLang, callback) => {
  return await chat(text, {
    callback: ({ provider, content, fullContent, done }) => {
      console.log(provider, content, fullContent, done);
    },
  });
};
