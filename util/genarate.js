import { getData } from "./yaml-handle.js";

export const getRootUrl = () => {
  if (location.href.includes("$mount-")) {
    const dirId = location.href.replace(/.+\$mount-(.+)o\-book.+/, "$1");
    return `/$mount-${dirId}o-book/`;
  }

  return "/";
};

export const initGenerator = async ({
  articleHandle, // 文章所在目录句柄
  websiteHandle, // 生成网站所在目录句柄
}) => {
  // 获取配置文件
  const configData = await getData(articleHandle);

  const tempDir = `${getRootUrl()}template/default`;

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
      name: "index.html",
      path: `${tempDir}/index.html`,
    },
    {
      name: "app-config.js",
      path: `${tempDir}/app-config.js`,
    },
  ];

  for (const { name, path } of files) {
    const fileHTML = await fetch(path).then((e) => e.text());
    const fileHandle = await websiteHandle.get(name, {
      create: "file",
    });
    await fileHandle.write(fileHTML);
  }

  console.log(configData);
};
