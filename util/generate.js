import { getData } from "./yaml-handle.js";
import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import jsBeautify from "/npm/js-beautify@1.15.1/+esm";

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
    const headerHandle = await websiteHandle.get("header.html");

    const headerContent = await headerHandle.text();

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
    await headerHandle.write(fixedHeaderContent);
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
        articleHandle.observe(async (e) => {
          const relatePath = e.path.replace(articleHandle.path + "/", "");

          if (!(relatePath.endsWith(".md") || relatePath.endsWith(".html"))) {
            // 必须是文章才监听
            return;
          }

          const originHandle = await articleHandle.get(relatePath);
          const targetHandle = await websiteLangHandle.get(
            relatePath.replace(/\.(html|md)$/, ".html"),
            {
              create: "file",
            },
          );

          await formatPage({
            inputHandle: originHandle,
            outputHandle: targetHandle,
            languageDirHandle: websiteLangHandle,
          });
        }),
      );
    }

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

    const configHandle = await websiteLangHandle.get("article-config.json", {
      create: "file",
    });

    await configHandle.write(JSON.stringify(siteConfig));

    await traverseFiles({
      sourceHandle: articleHandle,
      targetHandle: websiteLangHandle,
      languageDirHandle: websiteLangHandle,
    });
  }

  return cancels;
};

const traverseFiles = async ({
  sourceHandle, // 原始markdown文件目录
  targetHandle, // 需要输出网页到这个目录上
  languageDirHandle, // 对应语言网页的首个目录
}) => {
  for await (const handle of sourceHandle.values()) {
    if (handle.kind === "file") {
      if (handle.name.endsWith(".html") || handle.name.endsWith(".md")) {
        const outputName = handle.name.replace(/\.(html|md)$/, ".html");

        await formatPage({
          inputHandle: handle,
          outputHandle: await targetHandle.get(outputName, {
            create: "file",
          }),
          languageDirHandle,
        });
      }
    } else {
      await traverseFiles({
        sourceHandle: handle,
        targetHandle: await targetHandle.get(handle.name, {
          create: "dir",
        }),
        languageDirHandle,
      });
    }
  }
};

const formatPage = async ({ inputHandle, outputHandle, languageDirHandle }) => {
  let content = await inputHandle.text();

  if (inputHandle.name.endsWith("md")) {
    content = marked.parse(content);
    content = `<article class="markdown-body">${content}</article>`;
  }

  let titleText = "";

  // 获取title内容
  {
    const tempEl = $(`<template>${content}</template>`);

    // 获取标题
    const titleEl = tempEl.$("title,h1,h2,h3,h4");

    if (titleEl) {
      titleText = titleEl.text.trim();
    }

    // 不应该在正文出现 title
    if (titleEl && titleEl.is("title")) {
      titleEl.remove();

      content = tempEl.html;
    }
  }

  let finalHtml = indexHTML.replace("<!-- main content -->", content);

  const relativePath = outputHandle.path.replace(languageDirHandle.path, "");
  const directoryDepth = relativePath.split("/").length - 1;

  let pathPrefix = "";

  for (let i = 0; i < directoryDepth; i++) {
    pathPrefix += "../";
  }

  finalHtml = finalHtml
    .replace(
      '<o-app src="./js/app-config.js">',
      `<o-app src="${pathPrefix}js/app-config.js">`,
    )
    .replace(
      ' export const parent = "./layout.html";',
      ` export const parent = "${pathPrefix}layout.html";`,
    )
    .replace(
      `<link rel="stylesheet" href="../../css/palette.css" pui-colors />`,
      `<link rel="stylesheet" href="${pathPrefix}css/palette.css" pui-colors />`,
    )
    .replace(
      `<link rel="stylesheet" href="../../css/theme.css" />`,
      `<link rel="stylesheet" href="${pathPrefix}css/theme.css" />`,
    )
    .replace(
      '<l-m src="./comps/center-block.html"></l-m>',
      `<l-m src="${pathPrefix}comps/center-block.html"></l-m>`,
    )
    .replace(
      /href="\.\.\/\.\.\/css\/github-markdown\.css"/g,
      `href="${pathPrefix}css/github-markdown.css"`,
    );

  if (titleText) {
    finalHtml = finalHtml.replace(
      "<title>Document</title>",
      `<title>${titleText}</title>`,
    );
  }

  await outputHandle.write(
    jsBeautify.html(finalHtml, {
      indent_size: 2,
      indent_char: " ",
      eol: "\n",
      preserve_newlines: false,
    }),
  );
};

let indexHTML = "";

const initStaticFile = async ({ websiteHandle, logoImgName, logoPath }) => {
  const templateBasePath = `${getBasePath()}template/default`;
  const cssBasePath = `${getBasePath()}css`;

  const staticFiles = [
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
  ];

  if (logoImgName) {
    // 拷贝logo图片到img目录
    staticFiles.push({
      name: logoImgName,
      path: logoPath,
      outputPath: "img/" + logoImgName,
    });
  }

  const _files = await fetch(`${templateBasePath}/_files.json`).then((e) =>
    e.json(),
  );

  _files.forEach((path) => {
    staticFiles.push({
      name: path.split("/").pop(),
      path: `${templateBasePath}/${path}`,
      outputPath: path,
    });
  });

  for (const { name, path, outputPath } of staticFiles) {
    const fileContent = await fetch(path).then((e) => e.text());
    const fileHandle = await websiteHandle.get(outputPath || name, {
      create: "file",
    });
    await fileHandle.write(fileContent);
  }

  indexHTML = await fetch(`${templateBasePath}/index.html`).then((e) =>
    e.text(),
  );
};
