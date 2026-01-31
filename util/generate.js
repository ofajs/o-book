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
}) => {
  await initStaticFile({
    websiteHandle,
  });

  const { languages } = websiteConfig;

  for (const lang of languages) {
    const websiteLangHandle = await websiteHandle.get(lang, {
      create: "dir",
    });

    const articleHandle = await topHandle.get(lang);

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
};

const traverseFiles = async ({
  sourceHandle,
  targetHandle,
  languageDirHandle,
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
    content = `<article>${content}</article>`;
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
    );

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

const initStaticFile = async ({ websiteHandle }) => {
  const templateBasePath = `${getBasePath()}template/default`;
  const cssBasePath = `${getBasePath()}css`;

  const staticFiles = [
    {
      name: "header.html",
      path: `${templateBasePath}/header.html`,
    },
    {
      name: "layout.html",
      path: `${templateBasePath}/layout.html`,
    },
    {
      name: "app-config.js",
      path: `${templateBasePath}/js/app-config.js`,
      outputPath: "js/app-config.js",
    },
    {
      name: "util.js",
      path: `${templateBasePath}/js/util.js`,
      outputPath: "js/util.js",
    },
    {
      name: "center-block.html",
      path: `${templateBasePath}/comps/center-block.html`,
      outputPath: "comps/center-block.html",
    },
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
  ];

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
