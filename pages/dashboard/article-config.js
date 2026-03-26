import { getData } from "../../util/yaml-handle.js";

const fixUrlPath = (url) => url?.replace(/^\.\//, "").replace(/\.md$/, ".html");

/**
 * 保存文章配置信息
 * 读取每个导航分类的配置，生成导航数据
 */
export const saveArticleConfig = async (articleHandle, websiteLangHandle) => {
  const siteConfig = await getData(articleHandle);

  const processHeaderItem = async (headerItem) => {
    if (headerItem.content && !headerItem.url) {
      for (const childItem of headerItem.content) {
        await processHeaderItem(childItem);
      }
      return;
    }

    if (!headerItem.url) {
      return;
    }

    const headerItemData = await getData(articleHandle, headerItem.url);
    headerItem.data = headerItemData;

    const prefix = headerItem.url
      .replace(/^\.\//, "")
      .replace("_config.yaml", "");

    const fixContentUrl = (data) => {
      if (data.url) {
        data.url = fixUrlPath(data.url);
      }
      if (data.content) {
        data.content.forEach(fixContentUrl);
      }
    };

    fixContentUrl({ content: headerItemData });

    const flattenedItems = headerItemData.flatMap(
      (item) => item.content || [item],
    );
    const firstNavItem = flattenedItems[0];

    headerItem.firstUrl = prefix + firstNavItem?.url;
    headerItem.prefix = prefix;
  };

  for (const headerItem of siteConfig.header) {
    await processHeaderItem(headerItem);
  }

  const configFileHandle = await websiteLangHandle.get("article-config.json", {
    create: "file",
  });

  const writeFileIfChanged = async (fileHandle, newContent) => {
    const currentContent = await fileHandle.text();
    if (currentContent !== newContent) {
      await fileHandle.write(newContent);
    }
  };

  await writeFileIfChanged(configFileHandle, JSON.stringify(siteConfig));
};
