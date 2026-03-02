import { getData } from "./yaml-handle.js";
import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import hljs from "/npm/highlight.js@11.9.0/+esm";
import jsBeautify from "/npm/js-beautify@1.15.1/+esm";

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

const writeFileIfChanged = async (fileHandle, newContent) => {
  const currentContent = await fileHandle.text();
  if (currentContent !== newContent) {
    await fileHandle.write(newContent);
  }
};

const fixUrlPath = (url) => url?.replace(/^\.\//, "").replace(/\.md$/, ".html");

const getDirectoryDepth = (filePath, rootPath) =>
  filePath.replace(rootPath, "").split("/").length - 1;

const getPathPrefix = (filePath, rootPath) => {
  const depth = getDirectoryDepth(filePath, rootPath);
  return "../".repeat(depth).replace(/\/$/, "");
};

export const getBasePath = () => {
  if (location.href.includes("$mount-")) {
    const dirId = location.href.replace(/.+\$mount-(.+)o\-book.+/, "$1");
    return `/$mount-${dirId}o-book/`;
  }
  return "/";
};

export const initGenerator = async ({
  topHandle,
  lang,
  watchArticle = false,
  websiteHandle,
}) => {
  const projectConfig = await getData(topHandle);

  await initStaticFile({
    websiteHandle,
    logoImgName: projectConfig.logoImg
      ? projectConfig.logoImg.split("/").pop()
      : "",
    logoPath: projectConfig.logoImg
      ? `/${topHandle.path}/${projectConfig.logoImg.replace("./", "")}`
      : "",
  });

  // 修正 header 的logo路径
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

  let cancels = []; // 取消监听函数

  const websiteLangHandle = await websiteHandle.get(lang, {
    create: "dir",
  });

  const articleHandle = await topHandle.get(lang);

  if (watchArticle) {
    // 监听文章变化，及时生成对应的html文件
    cancels.push(
      articleHandle.observe(async (event) => {
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
          logoImageFileName: projectConfig.logoImg.split("/").pop(),
        });
      }),
    );
  }

  await saveArticleConfig(articleHandle, websiteLangHandle);

  const allArticleData = await traverseFiles({
    sourceDirHandle: articleHandle,
    targetDirHandle: websiteLangHandle,
    langRootDirHandle: websiteLangHandle,
    logoImageFileName: projectConfig.logoImg.split("/").pop(),
  });

  const dbFileHandle = await websiteLangHandle.get("db.json", {
    create: "file",
  });

  await writeFileIfChanged(dbFileHandle, JSON.stringify(allArticleData));

  return cancels;
};

const traverseFiles = async ({
  sourceDirHandle,
  targetDirHandle,
  langRootDirHandle,
  logoImageFileName,
}) => {
  const dataList = [];
  const entries = [];

  for await (const handle of sourceDirHandle.values()) {
    entries.push(handle);
  }

  const fileEntries = entries.filter(
    (h) =>
      h.kind === "file" && (h.name.endsWith(".html") || h.name.endsWith(".md")),
  );
  const dirEntries = entries.filter((h) => h.kind === "dir");

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

const formatPage = async ({
  inputFileHandle,
  outputFileHandle,
  langRootDirHandle,
  logoImageFileName,
}) => {
  let content = await inputFileHandle.text();

  if (content.trim().startsWith("<template ")) {
    await writeFileIfChanged(outputFileHandle, content);
    return;
  }

  if (inputFileHandle.name.endsWith("md")) {
    content = `<article class="markdown-body">${marked.parse(content)}</article>`;
  }

  let titleText = "";
  const paragraphContent = [];

  {
    let tempEl = $(`<template>${content}</template>`);
    const titleEl = tempEl.$("title,h1,h2,h3,h4");

    if (titleEl) {
      titleText = titleEl.text.trim();
    }

    if (titleEl && titleEl.is("title")) {
      titleEl.remove();
      content = tempEl.html;
      tempEl = $(`<template>${content}</template>`);
    }

    const aEls = tempEl.all("a");

    if (aEls.length > 0) {
      aEls.forEach((aEl) => {
        const href = aEl.attr("href");

        if (/^http/.test(href)) {
          aEl.attr("target", "_blank");
          return;
        }

        aEl.attr("href", href.replace(/\.md(\?.*)?$/, ".html$1"));
        aEl.attr("olink", "");
      });

      content = tempEl.html;
    }

    tempEl.$("article")?.forEach((p) => {
      paragraphContent.push({ t: p.tag, c: p.text.trim() });
    });
  }

  const pathPrefix = getPathPrefix(
    outputFileHandle.path,
    langRootDirHandle.path,
  );

  let finalHtml = indexHTML
    .replace("<!-- main content -->", content)
    .replace(/\{pathPrefix\}/g, pathPrefix);

  if (titleText) {
    finalHtml = finalHtml.replace(
      "<title>Document</title>",
      `<title>${titleText}</title>`,
    );
  }

  if (logoImageFileName) {
    finalHtml = finalHtml.replace(
      '<link rel="icon" href="https://ofajs.com/publics/logo.svg" />',
      `<link rel="icon" href="${pathPrefix}/img/${logoImageFileName}" />`,
    );
  }

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

  if (logoImgName) {
    // 拷贝logo图片到img目录
    staticFileList.push({
      name: logoImgName,
      path: logoPath,
      outputPath: "img/" + logoImgName,
    });
  }

  const templateFileList = await fetch(`${templateBasePath}/_files.json`).then(
    (response) => response.json(),
  );

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

  await Promise.all(
    staticFileList.map(async ({ name, path: filePath, outputPath }) => {
      const fileContent = await fetch(filePath).then((r) => r.text());
      const fileHandle = await websiteHandle.get(outputPath || name, {
        create: "file",
      });
      await writeFileIfChanged(fileHandle, fileContent);
    }),
  );

  indexHTML = await fetch(`${templateBasePath}/index.html`).then((response) =>
    response.text(),
  );
};

const saveArticleConfig = async (articleHandle, websiteLangHandle) => {
  const siteConfig = await getData(articleHandle);

  for (const headerItem of siteConfig.header) {
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
  }

  const configFileHandle = await websiteLangHandle.get("article-config.json", {
    create: "file",
  });

  await writeFileIfChanged(configFileHandle, JSON.stringify(siteConfig));
};
