import { saveArticleConfig } from "./article-config.js";

/**
 * 启动文章监听
 * 监听文章目录变化，实时生成对应的 HTML 文件
 * @param {Object} articleHandle - 文章目录的 handle
 * @param {Object} websiteLangHandle - 网站语言目录的 handle
 * @param {Function} formatPage - 格式化页面的函数
 * @returns {Array} 返回取消监听函数数组
 */
export const startArticleWatch = async ({
  articleHandle,
  websiteLangHandle,
  formatPage,
}) => {
  const cancels = [];

  cancels.push(
    await articleHandle.observe(async (event) => {
      const relativePath = event.path.replace(articleHandle.path + "/", "");

      if (relativePath.endsWith("_config.yaml")) {
        await saveArticleConfig(articleHandle, websiteLangHandle);
        return;
      }

      if (!relativePath.endsWith(".md") && !relativePath.endsWith(".html")) {
        return;
      }

      const sourceFileHandle = await articleHandle.get(relativePath);
      const targetFileHandle = await websiteLangHandle.get(
        relativePath.replace(/\.(html|md)$/, ".html"),
        { create: "file" },
      );

      await formatPage({
        inputFileHandle: sourceFileHandle,
        outputFileHandle: targetFileHandle,
        langRootDirHandle: websiteLangHandle,
      });
    }),
  );

  return cancels;
};
