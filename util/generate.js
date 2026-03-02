import { getData } from "./yaml-handle.js";
import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import hljs from "/npm/highlight.js@11.9.0/+esm";
import jsBeautify from "/npm/js-beautify@1.15.1/+esm";
import { genRag } from "./gen-rag.js";

marked.use({
  renderer: {
    code({ text, lang }) {
      const code = text || "";
      const language = lang || null;

      if (language && hljs.getLanguage(language)) {
        try {
          const highlighted = hljs.highlight(code, { language }).value;
          return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        } catch (e) {
          console.warn(`Highlight error for language ${language}:`, e);
        }
      }

      try {
        const highlighted = hljs.highlightAuto(code).value;
        return `<pre><code class="hljs">${highlighted}</code></pre>`;
      } catch (e) {
        console.warn("Auto highlight error:", e);
        return `<pre><code>${code}</code></pre>`;
      }
    },
  },
});

/**
 * 如果文件内容发生变化，则写入文件
 * 用于避免不必要的磁盘写入操作
 */
const writeFileIfChanged = async (fileHandle, newContent) => {
  const currentContent = await fileHandle.text();
  if (currentContent !== newContent) {
    await fileHandle.write(newContent);
  }
};

/**
 * 修正 URL 路径：将 ./ 前缀去掉，并将 .md 转换为 .html
 * 例如: ./guide/getting-started.md -> guide/getting-started.html
 */
const fixUrlPath = (url) => url?.replace(/^\.\//, "").replace(/\.md$/, ".html");

/**
 * 计算文件相对于根目录的深度
 * 用于生成相对路径前缀
 */
const getDirectoryDepth = (filePath, rootPath) =>
  filePath.replace(rootPath, "").split("/").length - 1;

/**
 * 根据文件深度生成相对路径前缀
 * 例如: 深度为0返回""，深度为1返回"../"，深度为2返回"../../"
 */
const getPathPrefix = (filePath, rootPath) => {
  const depth = getDirectoryDepth(filePath, rootPath);
  return "../".repeat(depth).replace(/\/$/, "");
};

/**
 * 获取项目的基础路径
 * 支持挂载模式下的路径解析
 */
export const getBasePath = () => {
  if (location.href.includes("$mount-")) {
    const dirId = location.href.replace(/.+\$mount-(.+)o\-book.+/, "$1");
    return `/$mount-${dirId}o-book/`;
  }
  return "/";
};

/**
 * 初始化网站生成器
 * @param {Object} options 配置选项
 * @param {Object} options.topHandle - 项目根目录的 handle
 * @param {string} options.lang - 文档的写作语言
 * @param {boolean} options.watchArticle - 是否监听文章变化实时更新
 * @param {Object} options.websiteHandle - 输出网站的目录 handle
 */
export const initGenerator = async ({
  topHandle,
  lang,
  watchArticle = false,
  websiteHandle,
}) => {
  // 生成 rag 索引文件内容
  genRag({ topHandle, lang, websiteHandle });

  const projectConfig = await getData(topHandle);

  // 初始化静态资源文件（CSS、模板文件等）
  await initStaticFile({
    websiteHandle,
    logoImgName: projectConfig.logoImg
      ? projectConfig.logoImg.split("/").pop()
      : "",
    logoPath: projectConfig.logoImg
      ? `/${topHandle.path}/${projectConfig.logoImg.replace("./", "")}`
      : "",
  });

  // 修正 header 的 logo 路径和文字
  if (projectConfig.logoImg || projectConfig.logoName) {
    const headerFileHandle = await websiteHandle.get("header.html");
    let headerContent = await headerFileHandle.text();

    const logoSrc = projectConfig.logoImg
      ? `./img/${projectConfig.logoImg.split("/").pop()}`
      : "";
    const logoText = projectConfig.logoName || "";

    headerContent = headerContent
      .replace(
        `<img class="logo" src="https://ofajs.com/publics/logo.svg" />`,
        `<img class="logo" src="${logoSrc}" />`,
      )
      .replace(
        `<div class="logo-text">ofa.js</div>`,
        `<div class="logo-text">${logoText}</div>`,
      );

    await writeFileIfChanged(headerFileHandle, headerContent);
  }

  // 存储取消监听函数，用于组件卸载时停止监听
  let cancels = [];

  // 获取对应语言的文章目录
  const websiteLangHandle = await websiteHandle.get(lang, {
    create: "dir",
  });

  const articleHandle = await topHandle.get(lang);

  // 如果需要监听文章变化
  if (watchArticle) {
    // 监听文章变化，及时生成对应的 html 文件
    cancels.push(
      articleHandle.observe(async (event) => {
        const relativePath = event.path.replace(articleHandle.path + "/", "");

        // 如果是 _config.yaml 文件，则更新文章配置
        if (relativePath.endsWith("_config.yaml")) {
          await saveArticleConfig(articleHandle, websiteLangHandle);
          return;
        }

        // 只处理 .md 和 .html 文件
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
          logoImageFileName: projectConfig.logoImg.split("/").pop(),
        });
      }),
    );
  }

  // 保存文章配置信息
  await saveArticleConfig(articleHandle, websiteLangHandle);

  // 遍历所有文章文件并生成 HTML
  const allArticleData = await traverseFiles({
    sourceDirHandle: articleHandle,
    targetDirHandle: websiteLangHandle,
    langRootDirHandle: websiteLangHandle,
    logoImageFileName: projectConfig.logoImg.split("/").pop(),
  });

  // 生成数据库文件，用于搜索等功能
  const dbFileHandle = await websiteLangHandle.get("db.json", {
    create: "file",
  });

  await writeFileIfChanged(dbFileHandle, JSON.stringify(allArticleData));

  return cancels;
};

/**
 * 递归遍历源目录，处理所有文章文件
 * 同级文件并行处理，子目录递归处理
 */
const traverseFiles = async ({
  sourceDirHandle,
  targetDirHandle,
  langRootDirHandle,
  logoImageFileName,
}) => {
  const dataList = [];
  const entries = [];

  // 收集所有文件和目录
  for await (const handle of sourceDirHandle.values()) {
    entries.push(handle);
  }

  // 分离文件和目录
  const fileEntries = entries.filter(
    (h) =>
      h.kind === "file" && (h.name.endsWith(".html") || h.name.endsWith(".md")),
  );
  const dirEntries = entries.filter((h) => h.kind === "dir");

  // 并行处理所有文件
  const fileResults = await Promise.all(
    fileEntries.map(async (handle) => {
      const outputName = handle.name.replace(/\.(html|md)$/, ".html");
      const outputFileHandle = await targetDirHandle.get(outputName, {
        create: "file",
      });

      const pageData = await formatPage({
        inputFileHandle: handle,
        outputFileHandle,
        langRootDirHandle,
        logoImageFileName,
      });

      return pageData
        ? {
            url: fixUrlPath(
              outputFileHandle.path.replace(langRootDirHandle.path, ""),
            ),
            title: pageData.title,
            content: pageData.content,
          }
        : null;
    }),
  );

  dataList.push(...fileResults.filter(Boolean));

  // 串行处理子目录（保证目录结构的依赖顺序）
  for (const handle of dirEntries) {
    const subTargetHandle = await targetDirHandle.get(handle.name, {
      create: "dir",
    });

    const subDataList = await traverseFiles({
      sourceDirHandle: handle,
      targetDirHandle: subTargetHandle,
      langRootDirHandle,
      logoImageFileName,
    });

    dataList.push(...subDataList);
  }

  return dataList;
};

/**
 * 格式化单个页面
 * 将 Markdown 转换为 HTML，处理链接、图片等
 */
const formatPage = async ({
  inputFileHandle,
  outputFileHandle,
  langRootDirHandle,
  logoImageFileName,
}) => {
  let content = await inputFileHandle.text();

  // 如果是 ofa.js 组件模板（<template 开头），直接输出不做转换
  if (content.trim().startsWith("<template ")) {
    await writeFileIfChanged(outputFileHandle, content);
    return;
  }

  // Markdown 文件转换为 HTML
  if (inputFileHandle.name.endsWith("md")) {
    content = `<article class="markdown-body">${marked.parse(content)}</article>`;
  }

  let titleText = "";
  const paragraphContent = [];

  {
    // 解析 HTML 内容，提取标题和链接
    let tempEl = $(`<template>${content}</template>`);
    const titleEl = tempEl.$("title,h1,h2,h3,h4");

    if (titleEl) {
      titleText = titleEl.text.trim();
    }

    // 如果有 title 标签，从正文中移除
    if (titleEl && titleEl.is("title")) {
      titleEl.remove();
      content = tempEl.html;
      tempEl = $(`<template>${content}</template>`);
    }

    // 处理所有链接
    const aEls = tempEl.all("a");

    if (aEls.length > 0) {
      aEls.forEach((aEl) => {
        const href = aEl.attr("href");

        // 外部链接打开新窗口
        if (/^http/.test(href)) {
          aEl.attr("target", "_blank");
          return;
        }

        // 内部链接 .md 转换为 .html
        aEl.attr("href", href.replace(/\.md(\?.*)?$/, ".html$1"));
        // 标记为站内链接
        aEl.attr("olink", "");
      });

      content = tempEl.html;
    }

    // 提取文章段落用于搜索索引
    tempEl.$("article")?.forEach((p) => {
      paragraphContent.push({ t: p.tag, c: p.text.trim() });
    });
  }

  // 计算相对路径前缀
  const pathPrefix = getPathPrefix(
    outputFileHandle.path,
    langRootDirHandle.path,
  );

  // 生成最终 HTML
  let finalHtml = indexHTML
    .replace("<!-- main content -->", content)
    .replace(/\{pathPrefix\}/g, pathPrefix);

  // 设置页面标题
  if (titleText) {
    finalHtml = finalHtml.replace(
      "<title>Document</title>",
      `<title>${titleText}</title>`,
    );
  }

  // 设置网站图标
  if (logoImageFileName) {
    finalHtml = finalHtml.replace(
      '<link rel="icon" href="https://ofajs.com/publics/logo.svg" />',
      `<link rel="icon" href="${pathPrefix}/img/${logoImageFileName}" />`,
    );
  }

  // 格式化 HTML（缩进等）
  finalHtml = jsBeautify.html(finalHtml, {
    indent_size: 2,
    indent_char: " ",
    eol: "\n",
    preserve_newlines: false,
    unformatted: ["code"],
  });

  await writeFileIfChanged(outputFileHandle, finalHtml);

  return {
    title: titleText,
    content: paragraphContent,
  };
};

let indexHTML = "";

/**
 * 初始化静态资源文件
 * 从模板目录复制 CSS、JS、HTML 模板等到输出目录
 */
const initStaticFile = async ({ websiteHandle, logoImgName, logoPath }) => {
  const templateBasePath = `${getBasePath()}template/default`;
  const cssBasePath = `${getBasePath()}css`;

  const staticFileList = [
    {
      name: "palette.css",
      path: `${cssBasePath}/palette.css`,
      outputPath: "css/palette.css",
    },
    {
      name: "theme.css",
      path: `${cssBasePath}/theme.css`,
      outputPath: "css/theme.css",
    },
    {
      name: "github-markdown.css",
      path: `${cssBasePath}/github-markdown.css`,
      outputPath: "css/github-markdown.css",
    },
    {
      name: "hljs.css",
      path: `${cssBasePath}/hljs.css`,
      outputPath: "css/hljs.css",
    },
  ];

  // 如果有 logo 图片，添加到复制列表
  if (logoImgName) {
    staticFileList.push({
      name: logoImgName,
      path: logoPath,
      outputPath: "img/" + logoImgName,
    });
  }

  // 获取模板文件列表
  const templateFileList = await fetch(`${templateBasePath}/_files.json`).then(
    (response) => response.json(),
  );

  // 添加模板文件到复制列表
  templateFileList.forEach((filePath) => {
    if (filePath.startsWith("/gh/") || filePath.startsWith("/nos/")) {
      staticFileList.push({
        name: filePath.split("/").pop(),
        path: filePath,
        outputPath: filePath.replace(/^\//, ""),
      });
      return;
    }

    staticFileList.push({
      name: filePath.split("/").pop(),
      path: `${templateBasePath}/${filePath}`,
      outputPath: filePath,
    });
  });

  // 并行复制所有静态文件
  await Promise.all(
    staticFileList.map(async ({ name, path: filePath, outputPath }) => {
      const fileContent = await fetch(filePath).then((r) => r.text());
      const fileHandle = await websiteHandle.get(outputPath || name, {
        create: "file",
      });
      await writeFileIfChanged(fileHandle, fileContent);
    }),
  );

  // 获取首页模板
  indexHTML = await fetch(`${templateBasePath}/index.html`).then((response) =>
    response.text(),
  );
};

/**
 * 保存文章配置信息
 * 读取每个导航分类的配置，生成导航数据
 */
const saveArticleConfig = async (articleHandle, websiteLangHandle) => {
  const siteConfig = await getData(articleHandle);

  // 处理每个顶部导航项
  for (const headerItem of siteConfig.header) {
    // 读取该分类的配置
    const headerItemData = await getData(articleHandle, headerItem.url);
    headerItem.data = headerItemData;

    // 生成路径前缀
    const prefix = headerItem.url
      .replace(/^\.\//, "")
      .replace("_config.yaml", "");

    // 递归修正所有内容项的 URL
    const fixContentUrl = (data) => {
      if (data.url) {
        data.url = fixUrlPath(data.url);
      }
      if (data.content) {
        data.content.forEach(fixContentUrl);
      }
    };

    fixContentUrl({ content: headerItemData });

    // 扁平化获取第一个导航项的 URL
    const flattenedItems = headerItemData.flatMap(
      (item) => item.content || [item],
    );
    const firstNavItem = flattenedItems[0];

    // 存储第一个 URL 和前缀
    headerItem.firstUrl = prefix + firstNavItem?.url;
    headerItem.prefix = prefix;
  }

  // 写入配置文件
  const configFileHandle = await websiteLangHandle.get("article-config.json", {
    create: "file",
  });

  await writeFileIfChanged(configFileHandle, JSON.stringify(siteConfig));
};
