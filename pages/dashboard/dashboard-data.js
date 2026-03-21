export const buildPreviewUrl = (activeHeader, url, path) => {
  const dirName = activeHeader
    .replace(/^\.\//, "")
    .replace(/\/_config\.yaml$/, "");

  const suffixName = url
    .replace(/^\.\//, "")
    .replace(/\.md$/, ".html");

  return `/${path}/website/cn/${dirName}/${suffixName}`;
};

export const buildIndexPreviewUrl = (path) => {
  return `/${path}/website/cn/index.html`;
};
