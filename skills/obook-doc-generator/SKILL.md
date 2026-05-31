---
name: "obook-doc-generator"
description: "帮助生成 OBook 文档站内容，包括配置文件和 markdown 文档。在创建或更新 OBook 文档、为 ofa.js 项目编写文档或生成多语言文档时调用。"
---

# OBook 文档生成器

OBook 是基于 ofa.js 构建的现代化文档系统，使用 Markdown 创建文档站点。此 SKILL 帮助 AI 助手生成 OBook 文档站内容。

**适用场景**：创建新文档站、添加文档页面、更新现有文档、生成多语言文档、创建 API 文档、为 ofa.js 项目编写教程或指南。

## 项目结构

```
your-project/
├── _config.yaml           # 根配置文件
├── cn/                    # 中文内容（写作语言）
│   ├── _config.yaml      # 语言根配置（定义章节导航）
│   ├── index.html        # 首页（可选）
│   ├── footer.html       # 页脚组件（可选）
│   ├── documentation/    # 文档章节
│   │   ├── _config.yaml  # 章节配置
│   │   └── *.md          # Markdown 文件
│   └── api/              # API 章节
│       ├── _config.yaml
│       └── *.md
├── en/                    # 英文内容（自动翻译）
└── website/              # 生成的静态站点
```

**关键规则**：
- 章节目录（如 `documentation/`、`api/`）通过语言根配置的 `header` 字段定义
- 每个章节目录必须包含自己的 `_config.yaml` 来定义页面结构
- 语言根配置的 `header` 决定顶部导航栏显示的章节

## 配置文件

### 根 `_config.yaml`

定义项目基本信息和多语言配置：

```yaml
name: 我的文档
writingLang: cn
languages:
  - cn
  - en
  - ja
```

### 语言根 `_config.yaml`（如 `cn/_config.yaml`）

定义该语言版本的导航结构和章节组织：

```yaml
index: ./index.html
header:
  - name: 教程
    url: ./documentation/_config.yaml
  - name: API
    url: ./api/_config.yaml
  - name: 其他
    content:
      - name: 场景问答
        url: ./scenarios/_config.yaml
```

| 字段 | 说明 |
|------|------|
| `index` | 首页文件路径 |
| `header` | 顶部导航栏章节列表 |
| `header[].name` | 章节显示名称 |
| `header[].url` | 章节配置文件路径（指向章节目录下的 `_config.yaml`） |
| `header[].content` | 嵌套子章节列表（可选，与 `url` 二选一） |

### 章节 `_config.yaml`

定义章节内的页面导航：

```yaml
- name: 介绍
  url: ./introduction.md
- name: 开始使用
  content:
    - name: 脚本引用
      url: ./script-reference.md
    - name: 创建第一个应用
      url: ./create-first-app.md
- name: 快速上手
  url: ./quick-start.md
```

## Markdown 文档编写

### 基本格式

```markdown
# 标题

简短的介绍段落。

## 第一节

内容。

### 子节 1.1

详细内容。

## 相关链接

- [链接文本](./related-file.md)
```

### 最佳实践

1. 使用正确的标题层级（h1 → h2 → h3）
2. 保持标题简短且具描述性
3. 代码示例使用带语言标注的代码块
4. 内部链接使用相对路径
5. 图片放在同目录或子目录中

## o-playground 交互式演示

OBook 支持使用 `o-playground` 组件创建交互式代码演示，展示 ofa.js 项目的运行效果。

### 核心规则

**规则一：标签内禁止空行**

`<o-playground>` 及其子标签之间不能有空行（连续两个换行符），否则会导致解析错误。可以有正常的换行和缩进。

❌ 错误（有空行）：
```markdown
<o-playground name="示例">

  <code path="demo.html">
    <template>
      <div>Hello World</div>
    </template>
  </code>

</o-playground>
```

✅ 正确（无空行）：
```markdown
<o-playground name="示例">
  <code path="demo.html">
    <template>
      <div>Hello World</div>
    </template>
  </code>
</o-playground>
```

**规则二：禁止重复引用 ofa.js**

playground 虚拟环境已自动加载 ofa.js，代码中不需要再引用。

❌ 错误（重复加载）：
```markdown
<o-playground name="Button 基本用法">
  <code path="demo.html" preview active>
    <template>
      <script src="https://cdn.jsdelivr.net/gh/ofajs/ofa.js/dist/ofa.min.mjs" type="module"></script>
      <l-m src="https://punch-ui-v2.pages.dev/packages/button/button.html"></l-m>
      <p-button>默认按钮</p-button>
    </template>
  </code>
</o-playground>
```

✅ 正确（无需引用 ofa.js）：
```markdown
<o-playground name="Button 基本用法">
  <code path="demo.html" preview active>
    <template>
      <l-m src="https://punch-ui-v2.pages.dev/packages/button/button.html"></l-m>
      <p-button>默认按钮</p-button>
    </template>
  </code>
</o-playground>
```

**规则三：`preview` 属性仅用于普通模板**

- ✅ 可用于：`<template>`（不带 `page` 或 `component` 属性）
- ❌ 不能用于：`<template page>` 或 `<template component>`

原因：Page 模块和组件模块需通过 ofa.js 特定机制加载，不能直接作为预览文件。

### 基本用法

```markdown
<o-playground name="示例名称" style="--editor-height: 500px">
  <code path="demo.html">
    <template>
      <div id="target">Hello World</div>
      <script>
        console.log("Hello");
      </script>
    </template>
  </code>
</o-playground>
```

### 多文件支持

使用多个 `<code>` 标签定义多个文件：

```markdown
<o-playground name="组件示例" style="--editor-height: 600px">
  <code path="demo.html" preview>
    <template>
      <l-m src="./my-component.html"></l-m>
      <my-component></my-component>
    </template>
  </code>
  <code path="my-component.html" active>
    <template component>
      <style>
        .container { padding: 20px; }
      </style>
      <div class="container">组件内容</div>
      <script>
        export default {
          tag: "my-component",
          data: {},
          ready() {
            console.log("组件已就绪");
          }
        };
      </script>
    </template>
  </code>
</o-playground>
```

### 标签属性参考

**`<o-playground>` 属性**：

| 属性 | 说明 |
|------|------|
| `name` | 项目名称，标识项目来源 |

**`<code>` 属性**：

| 属性 | 必需 | 说明 |
|------|------|------|
| `path` | 是 | 文件路径和文件名 |
| `preview` | 否 | 标记为预览文件（仅普通模板可用） |
| `active` | 否 | 设为当前激活状态，默认在编辑器中显示 |
| `unimportant` | 否 | 标记为"不重要"文件，可通过设置隐藏 |

**样式变量**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `--editor-height` | 编辑器高度 | `200px` |
| `--preview-height` | 预览区高度 | `200px` |

### `<template>` 类型识别与处理

| 类型 | 标记 | 处理方式 | 适用场景 |
|------|------|----------|----------|
| 普通模板 | `<template>` | 去掉 `<template>` 标签，内容直接放入 HTML，自动注入 ofa.js | 快速演示 HTML/JS 代码 |
| Page 模块 | `<template page>` | 保留 `<template page>` 标签，作为 ofa.js Page 模块处理 | 演示 ofa.js 页面功能 |
| 组件模块 | `<template component>` | 保留 `<template component>` 标签，作为 ofa.js 组件模块处理 | 演示 ofa.js 组件功能 |

普通模板示例：
```markdown
<template>
  <div>Hello World</div>
  <script>console.log("Hello");</script>
</template>
```

Page 模块示例：
```markdown
<template page>
  <style>:host { display: block; }</style>
  <div>{{message}}</div>
  <script>
    export default async () => {
      return { data: { message: "Hello" } };
    };
  </script>
</template>
```

组件模块示例：
```markdown
<template component>
  <style>.container { padding: 20px; }</style>
  <div class="container">组件内容</div>
  <script>
    export default {
      tag: "my-component",
      data: {},
      ready() { console.log("ready"); }
    };
  </script>
</template>
```

### 完整示例：ofa.js 应用

```markdown
<o-playground name="ofa.js 应用示例" style="--editor-height: 500px">
  <code path="demo.html" preview active>
    <template>
      <o-app src="./app-config.js"></o-app>
    </template>
  </code>
  <code path="app-config.js">
    export const home = "./home.html";
  </code>
  <code path="home.html">
    <template page>
      <style>
        :host {
          display: block;
          padding: 10px;
        }
      </style>
      <p>{{val}}</p>
      <script>
        export default async () => {
          return {
            data: {
              val: "Hello ofa.js App Demo",
            },
          };
        };
      </script>
    </template>
  </code>
</o-playground>
```

## 多语言支持

OBook 内置 AI 翻译支持，可自动将文档翻译成多种语言。

**核心原则：AI 助手只生成写作语言的文档，无需生成其他语言版本。**

工作流程：
1. 在根 `_config.yaml` 中设置 `writingLang` 和 `languages`
2. AI 助手只在写作语言目录（如 `cn/`）中编写内容
3. 用户通过 OBook 应用自动翻译新增或修改的内容
4. OBook 应用翻译更省 token（只翻译增量内容、使用优化策略）

最佳实践：
- 只创建写作语言的配置文件和文档，OBook 自动处理其他语言
- 编写易于翻译的内容：避免特定文化引用，使用清晰明确的语言

## 工作流程：创建新文档

### 步骤 1：规划结构

- 需要哪些章节？
- 每个章节涵盖哪些主题？
- 逻辑顺序是什么？

### 步骤 2：创建配置文件

只需创建写作语言的配置文件：

1. 根配置（如不存在）
2. 语言根配置（如 `cn/_config.yaml`）
3. 章节配置（如 `cn/documentation/_config.yaml`）

### 步骤 3：编写 Markdown 文件

1. 创建 `.md` 文件
2. 编写清晰简洁的内容
3. 包含代码示例
4. 添加相关文档链接

### 步骤 4：更新导航

更新相关 `_config.yaml`，将新文件加入导航。

### 示例：创建"高级特性"章节

1. 创建目录：`cn/advanced-features/`

2. 创建 `cn/advanced-features/_config.yaml`：
   ```yaml
   - name: 概述
     url: ./overview.md
   - name: 特性 A
     url: ./feature-a.md
   - name: 特性 B
     url: ./feature-b.md
   ```

3. 为每个主题创建 markdown 文件

4. 更新 `cn/_config.yaml`：
   ```yaml
   header:
     - name: 教程
       url: ./documentation/_config.yaml
     - name: API
       url: ./api/_config.yaml
     - name: 高级特性
       url: ./advanced-features/_config.yaml
   ```

## AI 助手指南

1. **理解上下文**：生成文档前了解项目内容、目标受众和文档目标
2. **遵循现有模式**：查看已有文档，匹配写作风格、格式和命名约定
3. **保持简单**：使用清晰语言，避免不必要术语，解释技术术语
4. **提供示例**：为技术主题包含代码示例，适当使用交互式演示
5. **链接相关内容**：添加相关文档链接，在页面间建立逻辑流程
6. **只生成写作语言**：仅在写作语言目录（如 `cn/`）中生成内容，其他语言由 OBook 应用翻译

## 验证清单

- [ ] 所有 `_config.yaml` 文件具有有效的 YAML 语法
- [ ] 配置文件中的所有 URL 指向现有文件
- [ ] Markdown 文件具有正确的标题层级
- [ ] 代码示例正确且可运行
- [ ] 内部链接使用相对路径
- [ ] 图片和资源正确放置
- [ ] 内容清晰且组织良好
- [ ] 多语言支持配置正确

## 资源

- [OBook GitHub 仓库](https://github.com/kirakiray/o-book)
- [ofa.js 文档](https://github.com/ofajs/ofa.js)
- [示例文档站](https://github.com/ofajs/ofa.js/tree/main/tutorial)
