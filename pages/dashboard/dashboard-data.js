export const buildPreviewUrl = (activeHeader, url, path, lang) => {
  const dirName = activeHeader
    .replace(/^\.\//, "")
    .replace(/\/_config\.yaml$/, "");

  const suffixName = url
    .replace(/^\.\//, "")
    .replace(/\.md$/, ".html");

  return `/${path}/website/${lang}/${dirName}/${suffixName}`;
};

export const buildIndexPreviewUrl = (path, lang) => {
  return `/${path}/website/${lang}/index.html`;
};
