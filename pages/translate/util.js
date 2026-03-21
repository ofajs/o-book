import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";

export const getArticleData = async (handle, options = {}) => {
  let resultOptions = options;
  if (options.isRoot) {
    resultOptions = {
      rootPath: handle.path,
    };
  }

  if (handle.kind === "dir") {
    const children = [];
    for await (const item of handle.values()) {
      const childData = await getArticleData(item, resultOptions);
      if (childData) {
        children.push(childData);
      }
    }

    if (options.isRoot) {
      return children;
    }

    return {
      name: handle.name,
      path: handle.path.replace(resultOptions.rootPath + "/", ""),
      realPath: handle.path,
      isDir: true,
      children,
    };
  }

  const content = await handle.text();
  const relativePath = handle.path.replace(
    resultOptions.rootPath + "/",
    "",
  );

  if (handle.name.endsWith(".md")) {
    const blocks = marked.lexer(content);
    return {
      name: handle.name,
      path: relativePath,
      realPath: handle.path,
      blocks,
    };
  }

  if (handle.name.endsWith(".html")) {
    return {
      name: handle.name,
      path: relativePath,
      realPath: handle.path,
      content,
    };
  }

  return null;
};
