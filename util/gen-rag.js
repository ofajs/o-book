import { getData } from "./yaml-handle.js";

/**
 * 生成 RAG 索引文件内容
 * 将文档复制到网站目录，并生成元数据索引供 AI 使用
 * @param {Object} options 配置选项
 * @param {Object} options.topHandle - 项目根目录的 handle
 * @param {string} options.lang - 文档的语言（如 "cn", "en"）
 * @param {Object} options.websiteHandle - 输出网站的目录 handle
 */
export const genRag = async ({ topHandle, lang, websiteHandle }) => {
  const projectConfig = await getData(topHandle);
  const writingLang = lang || projectConfig.writingLang || "cn";

  const articleHandle = await topHandle.get(writingLang);
  const ragHandle = await websiteHandle.get("rag", { create: "dir" });

  const manifestData = {
    version: "1.0",
    lang: writingLang,
    generatedAt: new Date().toISOString(),
    project: projectConfig.name || "Documentation",
    files: [],
  };

  await traverseAndCopy({
    sourceHandle: articleHandle,
    targetHandle: ragHandle,
    basePath: "",
    manifestData,
  });

  const manifestHandle = await ragHandle.get("manifest.json", {
    create: "file",
  });
  await manifestHandle.write(JSON.stringify(manifestData, null, 2));

  const configHandle = await ragHandle.get("_config.yaml", {
    create: "file",
  });
  const ragConfig = {
    name: `${projectConfig.name || "Documentation"} - RAG Index`,
    description: `RAG index for ${writingLang} documentation`,
    version: "1.0",
    lang: writingLang,
    filesCount: manifestData.files.length,
    lastGenerated: new Date().toISOString(),
  };
  const yaml = await import("/npm/js-yaml@4.1.1/dist/js-yaml.min.mjs");
  await configHandle.write(yaml.dump(ragConfig));

  return {
    filesCount: manifestData.files.length,
    lang: writingLang,
  };
};

/**
 * 递归遍历源目录，复制所有 md 文件并生成索引
 */
const traverseAndCopy = async ({
  sourceHandle,
  targetHandle,
  basePath,
  manifestData,
}) => {
  const entries = [];

  for await (const handle of sourceHandle.values()) {
    entries.push(handle);
  }

  const fileEntries = entries.filter(
    (h) =>
      h.kind === "file" && (h.name.endsWith(".md") || h.name.endsWith(".html")),
  );
  const dirEntries = entries.filter((h) => h.kind === "dir");

  for (const handle of fileEntries) {
    const relativePath = basePath ? `${basePath}/${handle.name}` : handle.name;
    const outputName = handle.name.replace(/\.(html|md)$/, ".md");
    const outputHandle = await targetHandle.get(outputName, { create: "file" });

    let content = await handle.text();

    if (
      handle.name.endsWith(".html") &&
      content.trim().startsWith("<template ")
    ) {
      continue;
    }

    await outputHandle.write(content);

    const fileMeta = await extractMetadata(content, relativePath);
    manifestData.files.push(fileMeta);
  }

  for (const handle of dirEntries) {
    const subDirHandle = await targetHandle.get(handle.name, { create: "dir" });
    const subBasePath = basePath ? `${basePath}/${handle.name}` : handle.name;

    await traverseAndCopy({
      sourceHandle: handle,
      targetHandle: subDirHandle,
      basePath: subBasePath,
      manifestData,
    });
  }
};

/**
 * 从文件中提取元数据用于 RAG 索引
 */
const extractMetadata = async (content, relativePath) => {
  let title = "";
  let description = "";
  let tags = [];

  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace(/^#+\s*/, "").trim();
      break;
    }
  }

  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  const tagsMatch = content.match(/^tags:\s*\[(.+)\]$/m);
  if (tagsMatch) {
    tags = tagsMatch[1].split(",").map((t) => t.trim());
  }

  const pathParts = relativePath.replace(/\.(html|md)$/, "").split("/");
  if (pathParts.length > 1) {
    tags.push(pathParts[0]);
  }

  const wordsCount = content.split(/\s+/).length;
  const charsCount = content.length;

  return {
    path: relativePath.replace(/\.(html|md)$/, ".md"),
    title: title || pathParts[pathParts.length - 1],
    description: description.substring(0, 200),
    tags,
    wordsCount,
    charsCount,
    category: pathParts.length > 1 ? pathParts[0] : "root",
  };
};
