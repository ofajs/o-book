import { saveArticleConfig } from "./article-config.js";

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
