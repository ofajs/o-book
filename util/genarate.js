import { getData } from "./yaml-handle.js";

export const initGenerator = async ({
  articleHandle, // 文章所在目录句柄
  websiteHandle, // 生成网站所在目录句柄
}) => {
  // 获取配置文件
  const configData = await getData(articleHandle);

  debugger;
};
