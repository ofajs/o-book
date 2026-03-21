import { marked } from "/npm/marked@17.0.1/lib/marked.esm.js";
import { getHash } from "/nos/util/hash/get-hash.js";

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

      if (item.kind === "dir") {
        children.push(...childData);
      } else if (childData) {
        children.push(childData);
      }
    }

    return children;
  }

  const content = await handle.text();
  const relativePath = handle.path.replace(resultOptions.rootPath + "/", "");

  if (handle.name.endsWith(".md")) {
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
  }

  if (handle.name.endsWith(".html")) {
    if (content.startsWith("<template ")) {
      // 组件或页面模块，直接返回内容
      return {
        name: handle.name,
        path: relativePath,
        realPath: handle.path,
        isTemp: true, // 属于页面或组件模块
        content,
        contentHash: await getHash(content),
      };
    }

    // 抽取子内容
    const temp = $(`<template>${content}</template>`);

    const blocks = [];

    const articles = temp.all("article");

    let article = null;
    if (articles.length === 1) {
      article = articles[0];
    }

    if (article) {
      // 拆分子区域内容
      for (const e of Array.from(article)) {
        blocks.push({
          tag: e.tag.toLowerCase(),
          raw: e.ele.outerHTML,
          rawHash: await getHash(e.ele.outerHTML),
          content: e.html,
        });
      }

      const replaceContent = content.replace(article.html, "${temp}");

      return {
        name: handle.name,
        path: relativePath,
        realPath: handle.path,
        blocks,
        replaceContent,
      };
    }

    // 多个 article 或者没有 article，直接将子元素进行分割
    const children = temp.ele.content.children;

    for (const child of children) {
      blocks.push({
        tag: child.tagName.toLowerCase(),
        raw: child.outerHTML,
        rawHash: await getHash(child.outerHTML),
        content: child.innerHTML,
      });
    }

    return {
      name: handle.name,
      path: relativePath,
      realPath: handle.path,
      blocks,
    };
  }

  return null;
};
