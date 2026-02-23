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

export const getBasePath = () => {
  if (location.href.includes("$mount-")) {
    const dirId = location.href.replace(/.+\$mount-(.+)o\-book.+/, "$1");
    return `/$mount-${dirId}o-book/`;
  }

  return "/";
};

export const initGenerator = async ({
  websiteConfig,
  topHandle,
  websiteHandle,
  watchArticle = false,
  refreshType,
}) => {
  const projectConfig = await getData(topHandle);

  if (refreshType != "content") {
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

      const headerContent = await headerFileHandle.text();

      const fixedHeaderContent = headerContent
        .replace(
          `<img class="logo" src="https://ofajs.com/publics/logo.svg" />`,
          `<img class="logo" src="./img/${projectConfig.logoImg.split("/").pop()}" />`,
        )
        .replace(
          `<div class="logo-text">ofa.js</div>`,
          `<div class="logo-text">${projectConfig.logoName || ""}</div>`,
        );

      // 写回header文件
      await headerFileHandle.write(fixedHeaderContent);
    }
  }

  const { languages } = websiteConfig;

  let cancels = []; // 取消监听函数

  for (const lang of languages) {
    const websiteLangHandle = await websiteHandle.get(lang, {
      create: "dir",
    });

    const articleHandle = await topHandle.get(lang);

    if (watchArticle) {
      // 监听文章变化，及时生成对应的html文件
      cancels.push(
        articleHandle.observe(async (event) => {
          const relativePath = event.path.replace(articleHandle.path + "/", "");

          // 如果是_config.yaml文件，则更新文章配置
          if (relativePath.endsWith("_config.yaml")) {
            await saveArticleConfig(articleHandle, websiteLangHandle);
            return;
          }

          if (
            !(relativePath.endsWith(".md") || relativePath.endsWith(".html"))
          ) {
            // 必须是文章才监听
            return;
          }

          const sourceFileHandle = await articleHandle.get(relativePath);
          const targetFileHandle = await websiteLangHandle.get(
            relativePath.replace(/\.(html|md)$/, ".html"),
            {
              create: "file",
            },
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

    await dbFileHandle.write(JSON.stringify(allArticleData));
  }

  return cancels;
};

const traverseFiles = async ({
  sourceDirHandle, // 原始markdown文件目录
  targetDirHandle, // 需要输出网页到这个目录上
  langRootDirHandle, // 对应语言网页的首个目录
  logoImageFileName,
}) => {
  const dataList = [];

  for await (const handle of sourceDirHandle.values()) {
    if (handle.kind === "file") {
      if (handle.name.endsWith(".html") || handle.name.endsWith(".md")) {
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

        if (pageData) {
          dataList.push({
            url: outputFileHandle.path
              .replace(langRootDirHandle.path, "")
              .replace(/^\//, ""),
            title: pageData.title,
            content: pageData.content,
          });
        }
      }
    } else {
      const subDataList = await traverseFiles({
        sourceDirHandle: handle,
        targetDirHandle: await targetDirHandle.get(handle.name, {
          create: "dir",
        }),
        langRootDirHandle,
        logoImageFileName,
      });

      dataList.push(...subDataList);
    }
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

  // 产看是否ofa.js的组件或页面
  if (content.trim().startsWith("<template ")) {
    // 不做转换，直接输出
    await outputFileHandle.write(content);
    return;
  }

  if (inputFileHandle.name.endsWith("md")) {
    content = marked.parse(content);

    content = `<article class="markdown-body">${content}</article>`;
  }

  let titleText = "";
  const paragraphContent = [];

  {
    // 获取title内容
    let tempEl = $(`<template>${content}</template>`);

    // 获取标题
    const titleEl = tempEl.$("title,h1,h2,h3,h4");

    if (titleEl) {
      titleText = titleEl.text.trim();
    }

    // 不应该在正文出现 title
    if (titleEl && titleEl.is("title")) {
      titleEl.remove();

      content = tempEl.html;
      tempEl = $(`<template>${content}</template>`);
    }

    // 替换链接
    const aEls = tempEl.all("a");

    if (aEls.length > 0) {
      aEls.forEach((aEl) => {
        let href = aEl.attr("href");

        if (/^http/.test(href)) {
          // 外部链接，不处理
          aEl.attr("target", "_blank");
          return;
        }

        href = href.replace(/\.md$/, ".html");

        aEl.attr("href", href);
        aEl.attr("olink", "");
      });

      content = tempEl.html;
    }

    tempEl.$("article") &&
      tempEl.$("article").forEach((p) => {
        paragraphContent.push({
          t: p.tag,
          c: p.text.trim(),
        });
      });
  }

  let finalHtml = indexHTML.replace("<!-- main content -->", content);

  const relativePath = outputFileHandle.path.replace(
    langRootDirHandle.path,
    "",
  );
  const directoryDepth = relativePath.split("/").length - 1;

  // 根据目录深度生成相对路径前缀
  const pathPrefix = "../".repeat(directoryDepth).replace(/\/$/, "");

  finalHtml = finalHtml.replace(/\{pathPrefix\}/g, pathPrefix);

  if (titleText) {
    finalHtml = finalHtml.replace(
      "<title>Document</title>",
      `<title>${titleText}</title>`,
    );
  }

  if (logoImageFileName) {
    finalHtml = finalHtml.replace(
      '<link rel="icon" href="https://ofajs.com/publics/logo.svg" />',
      `<link rel=\"icon\" href=\"${pathPrefix}/img/${logoImageFileName}\" />`,
    );
  }

  await outputFileHandle.write(
    jsBeautify.html(finalHtml, {
      indent_size: 2,
      indent_char: " ",
      eol: "\n",
      preserve_newlines: false,
      unformatted: ["code"],
    }),
  );

  return {
    title: titleText,
    // content: contentText,
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
      const fileContent = await fetch(filePath).then((response) =>
        response.text(),
      );
      const fileHandle = await websiteHandle.get(outputPath || name, {
        create: "file",
      });
      await fileHandle.write(fileContent);
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
        data.url = data.url.replace(/^\.\//, "").replace(/\.md/, ".html");
      }
      if (data.content) {
        data.content.forEach(fixContentUrl);
      }
    };

    fixContentUrl({ content: headerItemData });

    const flattenedItems = headerItemData.flatMap((item) => {
      return item.content || [item];
    });

    const firstNavItem = flattenedItems[0];

    headerItem.firstUrl = prefix + firstNavItem.url;

    headerItem.prefix = prefix;
  }

  const configFileHandle = await websiteLangHandle.get("article-config.json", {
    create: "file",
  });

  await configFileHandle.write(JSON.stringify(siteConfig));
};
