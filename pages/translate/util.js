import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import { getHash } from "/nos/util/hash/get-hash.js";

const FILE_EXTENSIONS = {
  MARKDOWN: ".md",
  HTML: ".html",
};

const processMarkdownFile = async (handle, relativePath, content) => {
  try {
    const blocks = marked.lexer(content);
    for (const block of blocks) {
      block.rawHash = await getHash(block.raw);
    }
    return {
      name: handle.name,
      path: relativePath,
      realPath: handle.path,
      blocks,
    };
  } catch (error) {
    console.error(`Error processing markdown file ${handle.name}:`, error);
    return null;
  }
};

const createBlock = async (element) => {
  return {
    tag: element.tagName.toLowerCase(),
    raw: element.outerHTML,
    rawHash: await getHash(element.outerHTML),
    content: element.innerHTML,
  };
};

const processSingleArticle = async (article, content) => {
  const blocks = [];
  for (const e of Array.from(article)) {
    blocks.push({
      tag: e.tag.toLowerCase(),
      raw: e.ele.outerHTML,
      rawHash: await getHash(e.ele.outerHTML),
      content: e.html,
    });
  }
  return {
    blocks,
    replaceContent: content.replace(article.html, "${temp}"),
  };
};

const processMultipleArticles = async (children) => {
  const blocks = [];
  for (const child of children) {
    blocks.push(await createBlock(child));
  }
  return { blocks };
};

const processHtmlFile = async (handle, relativePath, content) => {
  try {
    if (content.startsWith("<template ")) {
      return {
        name: handle.name,
        path: relativePath,
        realPath: handle.path,
        isTemp: true,
        content,
        contentHash: await getHash(content),
      };
    }

    const temp = $(`<template>${content}</template>`);
    const articles = temp.all("article");

    let result;
    if (articles.length === 1) {
      result = await processSingleArticle(articles[0], content);
    } else {
      const children = temp.ele.content.children;
      result = await processMultipleArticles(children);
    }

    return {
      name: handle.name,
      path: relativePath,
      realPath: handle.path,
      ...result,
    };
  } catch (error) {
    console.error(`Error processing HTML file ${handle.name}:`, error);
    return null;
  }
};

const processFile = async (handle, rootPath) => {
  const content = await handle.text();
  const relativePath = handle.path.replace(rootPath + "/", "");

  if (handle.name.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
    return await processMarkdownFile(handle, relativePath, content);
  }

  if (handle.name.endsWith(FILE_EXTENSIONS.HTML)) {
    return await processHtmlFile(handle, relativePath, content);
  }

  return null;
};

const processDirectory = async (handle, rootPath) => {
  const children = [];
  for await (const item of handle.values()) {
    try {
      const childData = await getArticleData(item, { rootPath });

      if (item.kind === "dir") {
        children.push(...childData);
      } else if (childData) {
        children.push(childData);
      }
    } catch (error) {
      console.error(`Error processing item ${item.name}:`, error);
    }
  }
  return children;
};

export const getArticleData = async (handle, options = {}) => {
  try {
    let rootPath;
    if (options.isRoot) {
      rootPath = handle.path;
    } else {
      rootPath = options.rootPath;
    }

    if (!rootPath) {
      throw new Error("rootPath is required");
    }

    if (handle.kind === "dir") {
      return await processDirectory(handle, rootPath);
    }

    return await processFile(handle, rootPath);
  } catch (error) {
    console.error(`Error in getArticleData for ${handle.name}:`, error);
    return null;
  }
};
