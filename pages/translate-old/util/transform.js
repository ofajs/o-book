export const transformBlock = (block) => {
  if (!block.type) {
    return {
      tag: block.tag,
      rawHash: block.rawHash,
    };
  }
  return {
    type: block.type,
    rawHash: block.rawHash,
  };
};

export const transformArticle = (article) => {
  if (article.isTemp) {
    return {
      name: article.name,
      path: article.path,
      realPath: article.realPath,
      isTemp: true,
      contentHash: article.contentHash,
    };
  }
  return {
    name: article.name,
    path: article.path,
    realPath: article.realPath,
    blocks: article.blocks.map(transformBlock),
  };
};
