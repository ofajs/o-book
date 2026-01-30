import { getData } from "./yaml-handle.js";
import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import jsBeautify from "/npm/js-beautify@1.15.1/+esm";

export const getRootUrl = () => {
  if (location.href.includes("$mount-")) {
    const dirId = location.href.replace(/.+\$mount-(.+)o\-book.+/, "$1");
    return `/$mount-${dirId}o-book/`;
  }

  return "/";
};

export const initGenerator = async ({
  websiteConfig, // 网站配置
  topHandle, // 顶层句柄
  websiteHandle, // 生成网站所在目录句柄
}) => {
  // 初始化静态文件
  await initStaticFile({
    websiteHandle,
  });

  const { languages } = websiteConfig;

  for (let lang of languages) {
    const websiteLangHandle = await websiteHandle.get(lang, {
      create: "dir",
    });

    const articleHandle = await topHandle.get(lang);

    // 获取配置文件
    const configData = await getData(articleHandle);

    // 组合并写入配置文件的数据
    for (const configItem of configData.header) {
      const configData = await getData(articleHandle, configItem.url);

      configItem.data = configData;
    }

    // 保存文件数据
    const configHandle = await websiteLangHandle.get("article-config.json", {
      create: "file",
    });

    await configHandle.write(JSON.stringify(configData));

    // 遍历文件，套用内容
    await traversingFiles({
      fromArticleHandle: articleHandle, // 文章来源
      toWebsiteHandle: websiteLangHandle, // 要遍历的目录句柄
      websiteLangHandle, // 文章对应语言的顶部文件夹
    });
  }
};

const traversingFiles = async ({
  fromArticleHandle,
  toWebsiteHandle,
  websiteLangHandle,
}) => {
  // 遍历文件，套用内容
  for await (let handle of fromArticleHandle.values()) {
    if (handle.kind === "file") {
      if (handle.name.endsWith(".html") || handle.name.endsWith(".md")) {
        const outputName = handle.name.replace(/\.(html|md)$/, ".html");

        // 需要转换的文件
        await formatPage({
          inputHandle: handle,
          outputHandle: await toWebsiteHandle.get(outputName, {
            create: "file",
          }),
          websiteLangHandle,
        });
      }
    } else {
      // 目录，继续遍历内部
      await traversingFiles({
        fromArticleHandle: handle, // 文章来源
        toWebsiteHandle: await toWebsiteHandle.get(handle.name, {
          create: "dir",
        }), // 要遍历的目录句柄
        websiteLangHandle, // 文章对应语言的顶部文件夹
      });
    }
  }
};

// 将输入的文件转为对应网页
const formatPage = async ({ inputHandle, outputHandle, websiteLangHandle }) => {
  let content = await inputHandle.text();

  if (inputHandle.name.endsWith("md")) {
    content = marked.parse(content);
  }

  // 替换主体内容
  let outputContent = indexHTML.replace("<!-- main content -->", content);

  const relatePath = outputHandle.path.replace(websiteLangHandle.path, "");
  const floorsNum = relatePath.split("/").length - 1;

  let relateStr = "";

  for (let i = 0; i < floorsNum; i++) {
    relateStr += "../";
  }

  // 更新路径资源
  outputContent = outputContent
    .replace(
      ' <o-app src="./app-config.js">',
      ` <o-app src="${relateStr}app-config.js">`,
    )
    .replace(
      ' export const parent = "./layout.html";',
      ` export const parent = "${relateStr}layout.html";`,
    )
    .replace(
      `<link rel="stylesheet" href="../../css/palette.css" pui-colors />`,
      `<link rel="stylesheet" href="${relateStr}css/palette.css" pui-colors />`,
    )
    .replace(
      `<link rel="stylesheet" href="../../css/theme.css" />`,
      `<link rel="stylesheet" href="${relateStr}css/theme.css" />`,
    );

  await outputHandle.write(
    jsBeautify.html(outputContent, {
      indent_size: 2,
      indent_char: " ",
      eol: "\n",
      preserve_newlines: false,
    }),
  );
};

let indexHTML = "";

const initStaticFile = async ({ websiteHandle }) => {
  const tempDir = `${getRootUrl()}template/default`;
  const cssDir = `${getRootUrl()}css`;

  {
    // 先复制静态模板过去
    const files = [
      {
        name: "header.html",
        path: `${tempDir}/header.html`,
      },
      {
        name: "layout.html",
        path: `${tempDir}/layout.html`,
      },
      {
        name: "app-config.js",
        path: `${tempDir}/app-config.js`,
      },
      {
        name: "palette.css",
        path: `${cssDir}/palette.css`,
        out: "css/palette.css",
      },
      {
        name: "theme.css",
        path: `${cssDir}/theme.css`,
        out: "css/theme.css",
      },
    ];

    for (const { name, path, out } of files) {
      const fileHTML = await fetch(path).then((e) => e.text());
      const fileHandle = await websiteHandle.get(out || name, {
        create: "file",
      });
      await fileHandle.write(fileHTML);
    }
  }

  // 获取索引页HTML
  indexHTML = await fetch(`${tempDir}/index.html`).then((e) => e.text());
};
