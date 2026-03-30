const RULES = [
  {
    id: "html-wrapped-in-code-block",
    name: "HTML被代码块包裹",
    description: "纯HTML代码被错误地用 ``` 包裹",
    check: (original, translated) => {
      const isOriginalHtml =
        original.trim().startsWith("<") && original.trim().endsWith(">");
      const hasCodeBlock =
        translated.includes("```html") || translated.includes("```XML");
      if (isOriginalHtml && hasCodeBlock) {
        return {
          hasIssue: true,
          message: "HTML代码被错误地用代码块包裹",
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "escaped-dollar-removed",
    name: "转义美元符号丢失",
    description: "\\$ 符号前的斜杠被去掉",
    check: (original, translated) => {
      const hasEscapedDollar = /\\\$/.test(original);
      const hasUnescapedDollar = /(?<!\\)\$/.test(translated);
      const stillEscaped = /\\\$/.test(translated);
      if (hasEscapedDollar && !stillEscaped && hasUnescapedDollar) {
        return {
          hasIssue: true,
          message: "转义的美元符号 \\$ 丢失了斜杠",
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "extra-blank-lines",
    name: "多余空行",
    description: "翻译后出现过多的连续空行",
    check: (original, translated) => {
      const originalBlankLines = (original.match(/\n\s*\n\s*\n/g) || []).length;
      const translatedBlankLines = (translated.match(/\n\s*\n\s*\n/g) || [])
        .length;
      if (translatedBlankLines > originalBlankLines + 1) {
        return {
          hasIssue: true,
          message: `翻译后出现 ${translatedBlankLines - originalBlankLines} 个多余空行`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "code-block-broken",
    name: "代码块格式异常",
    description: "代码块的 ``` 数量不匹配",
    check: (original, translated) => {
      const originalCodeBlocks = (original.match(/```/g) || []).length;
      const translatedCodeBlocks = (translated.match(/```/g) || []).length;
      if (originalCodeBlocks !== translatedCodeBlocks) {
        return {
          hasIssue: true,
          message: `代码块数量不匹配，原文 ${originalCodeBlocks} 个，译文 ${translatedCodeBlocks} 个`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "html-tags-broken",
    name: "HTML标签被破坏",
    description: "HTML标签结构被破坏",
    check: (original, translated) => {
      const originalTags = original.match(/<[a-zA-Z][^>]*>/g) || [];
      const translatedTags = translated.match(/<[a-zA-Z][^>]*>/g) || [];
      const originalTagNames = originalTags
        .map((t) => t.match(/<([a-zA-Z]+)/)?.[1])
        .filter(Boolean);
      const translatedTagNames = translatedTags
        .map((t) => t.match(/<([a-zA-Z]+)/)?.[1])
        .filter(Boolean);
      const missingTags = originalTagNames.filter(
        (tag) => !translatedTagNames.includes(tag),
      );
      if (missingTags.length > 0) {
        return {
          hasIssue: true,
          message: `缺少HTML标签: ${missingTags.join(", ")}`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "link-format-broken",
    name: "链接格式异常",
    description: "Markdown链接格式被破坏",
    check: (original, translated) => {
      const originalLinks = original.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      const translatedLinks =
        translated.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      if (originalLinks.length !== translatedLinks.length) {
        return {
          hasIssue: true,
          message: `链接数量不匹配，原文 ${originalLinks.length} 个，译文 ${translatedLinks.length} 个`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "image-format-broken",
    name: "图片格式异常",
    description: "Markdown图片格式被破坏",
    check: (original, translated) => {
      const originalImages = original.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
      const translatedImages =
        translated.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
      if (originalImages.length !== translatedImages.length) {
        return {
          hasIssue: true,
          message: `图片数量不匹配，原文 ${originalImages.length} 个，译文 ${translatedImages.length} 个`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "list-format-broken",
    name: "列表格式异常",
    description: "列表项格式可能有问题",
    check: (original, translated) => {
      const originalListItems = original.match(/^[\s]*[-*+]\s/gm) || [];
      const translatedListItems = translated.match(/^[\s]*[-*+]\s/gm) || [];
      if (Math.abs(originalListItems.length - translatedListItems.length) > 1) {
        return {
          hasIssue: true,
          message: `列表项数量不匹配，原文 ${originalListItems.length} 个，译文 ${translatedListItems.length} 个`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "heading-hash-mismatch",
    name: "标题井号数量异常",
    description: "标题的井号数量不匹配",
    check: (original, translated) => {
      const originalHashes = (original.match(/^#+\s/gm) || []).length;
      const translatedHashes = (translated.match(/^#+\s/gm) || []).length;
      if (originalHashes !== translatedHashes) {
        return {
          hasIssue: true,
          message: `标题井号数量不匹配，原文 ${originalHashes} 个，译文 ${translatedHashes} 个`,
        };
      }
      return { hasIssue: false };
    },
  },
  {
    id: "chinese-in-translation",
    name: "翻译结果包含中文",
    description: "翻译结果中不应该出现中文字符",
    check: (original, translated) => {
      const chineseRegex = /[\u4e00-\u9fa5]/;
      const hasChinese = chineseRegex.test(translated);
      if (hasChinese) {
        const chineseMatches = translated.match(chineseRegex) || [];
        return {
          hasIssue: true,
          message: `翻译结果包含 ${chineseMatches.length} 个中文字符`,
        };
      }
      return { hasIssue: false };
    },
  },
];

export const checkTranslation = (
  original,
  translated,
  writingLang,
  targetLang,
) => {
  const issues = [];
  for (const rule of RULES) {
    const shouldCheck =
      rule.id !== "chinese-in-translation" ||
      (writingLang === "cn" && targetLang !== "t-cn");
    if (!shouldCheck) {
      continue;
    }
    const result = rule.check(original, translated);
    if (result.hasIssue) {
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        message: result.message,
      });
    }
  }
  return issues;
};

export const checkBlock = async (
  block,
  storage,
  targetLang,
  projectPath,
  writingLang,
) => {
  if (!block || !block.raw) {
    return null;
  }

  const cacheKey = block.rawHash;
  const cachedData = await storage.getItem(cacheKey);

  if (!cachedData) {
    return null;
  }

  const translatedText =
    typeof cachedData === "string"
      ? cachedData
      : cachedData.editedText || cachedData.text || "";

  if (!translatedText) {
    return null;
  }

  const issues = checkTranslation(
    block.raw,
    translatedText,
    writingLang,
    targetLang,
  );

  if (issues.length === 0) {
    return null;
  }

  return {
    block,
    translatedText,
    issues,
    provider: cachedData.provider || "",
    model: cachedData.model || "",
    id: cachedData.id || "",
  };
};

export { RULES };
