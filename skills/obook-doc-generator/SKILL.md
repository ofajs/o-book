---
name: "obook-doc-generator"
description: "帮助生成 OBook 文档站内容，包括配置文件和 markdown 文档。在创建或更新 OBook 文档、为 ofa.js 项目编写文档或生成多语言文档时调用。"
---

# OBook 文档生成器

这个 SKILL 帮助 AI 助手生成 OBook 文档站的内容。OBook 是一个基于 ofa.js 构建的现代化文档系统，允许你使用 Markdown 创建漂亮的文档站点。

## 何时使用此 SKILL

在以下情况下使用此 SKILL：
- 创建新的 OBook 文档站
- 添加新的文档页面
- 更新现有文档
- 生成多语言文档
- 创建 API 文档
- 为 ofa.js 项目编写教程或指南

## OBook 项目结构

典型的 OBook 项目具有以下结构：

```
your-project/
├── _config.yaml           # 根配置文件
├── cn/                    # 中文内容（写作语言）
│   ├── _config.yaml      # 语言特定配置（定义章节导航）
│   ├── index.html        # 首页（可选）
│   ├── footer.html       # 页脚组件（可选）
│   ├── documentation/    # 文档章节（通过 cn/_config.yaml 的 header 定义）
│   │   ├── _config.yaml  # 章节配置
│   │   └── *.md          # Markdown 文件
│   └── api/              # API 章节（通过 cn/_config.yaml 的 header 定义）
│       ├── _config.yaml
│       └── *.md
├── en/                    # 英文内容（自动翻译）
└── website/              # 生成的静态站点
```

**重要说明**：
- `documentation/`、`api/` 等章节目录是通过语言根配置文件（如 `cn/_config.yaml`）的 `header` 字段定义的
- 语言根配置文件的 `header` 字段决定了顶部导航栏显示的章节
- 每个章节目录必须包含自己的 `_config.yaml` 文件来定义该章节的页面结构

## 配置文件格式

### 根 `_config.yaml`

```yaml
name: 我的文档
writingLang: cn
languages:
  - cn
  - en
  - ja
```

### 语言根 `_config.yaml`（如 `cn/_config.yaml`）

语言根配置文件定义了该语言版本的导航结构和章节组织：

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

**字段说明**：
- `index`：指定首页文件路径
- `header`：定义顶部导航栏的章节列表
  - `name`：章节显示名称
  - `url`：章节配置文件路径（指向章节目录下的 `_config.yaml`）
  - `content`：嵌套的子章节列表（可选）

**章节定义规则**：
- 每个 `header` 条目对应一个章节目录（如 `documentation/`、`api/`）
- `url` 必须指向章节目录下的 `_config.yaml` 文件
- 章节目录名称可以自定义，但必须与 `url` 路径匹配

### 章节 `_config.yaml`

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

## Markdown 文档格式

### 基本结构

```markdown
# 标题

简短的介绍段落。

## 第一节

第一节的内容。

### 子节 1.1

详细内容。

## 第二节

更多内容。

## 相关链接

- [链接文本](./related-file.md)
```

### 文档最佳实践

1. **清晰的层级**：使用正确的标题级别（h1、h2、h3）
2. **简洁的标题**：保持标题简短且具有描述性
3. **代码示例**：使用带有语言规范的代码块
4. **链接**：内部链接使用相对路径
5. **图片**：将图片放在同一目录或子目录中

### 特殊组件

#### o-playground 代码演示

OBook 支持使用 `o-playground` 组件创建交互式代码演示，主要用于展示 ofa.js 项目的运行效果。

**基本用法**：

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

**多文件支持**：

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

**`<code>` 标签属性**：

| 属性 | 必需 | 说明 |
|------|------|------|
| `path` | 是 | 指定文件路径和文件名 |
| `preview` | 否 | 标记为预览文件，组件会在预览区加载此文件 |
| `active` | 否 | 设置为当前激活状态，默认在编辑器中显示此文件 |
| `unimportant` | 否 | 标记为"不重要"文件，可通过设置隐藏此类文件 |

**`<o-playground>` 组件属性**：

| 属性 | 说明 |
|------|------|
| `name` | 项目名称，用于标识项目来源 |

**样式变量**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `--editor-height` | 编辑器高度 | `200px` |
| `--preview-height` | 预览区高度 | `200px` |

**自动文件类型识别**：

组件会自动识别以下文件类型：
- **Page 组件**：`<template page>`
- **普通组件**：`<template component>`
- **普通模板**：`<template>` 或 `<pre>` 或其他标签
- **其他文件**：无特殊标记

**功能特性**：
- 多文件标签页编辑
- 代码高亮显示
- 实时预览（保存后自动刷新）
- 手动刷新预览
- 在新窗口打开预览
- 设置选项（隐藏不重要文件、恢复编辑器大小）

**完整示例 - ofa.js 应用**：

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

OBook 内置 AI 翻译支持，可以自动将文档翻译成多种语言。

### AI 助手工作流程

**重要**：AI 助手只需要生成**写作语言**的文档内容，无需生成其他语言的文档。

1. 在根 `_config.yaml` 中设置写作语言：
```yaml
writingLang: cn
languages:
  - cn
  - en
  - ja
```

2. AI 助手只需在写作语言目录中编写内容（如 `cn/`）

3. 用户打开 OBook 应用，选择项目目录

4. OBook 会自动检测新增或修改的内容，并提供翻译功能

5. 通过 OBook 应用进行翻译比 AI 直接生成翻译更省 token，因为：
   - 只翻译新增或修改的内容
   - 使用优化的翻译策略
   - 避免重复翻译相同内容

### 最佳实践

- **AI 助手**：只生成写作语言的文档（如 `cn/` 目录下的文件）
- **用户**：使用 OBook 应用的翻译功能生成其他语言版本
- **配置文件**：只需创建写作语言的配置文件，OBook 会自动处理其他语言

## 创建新文档

### 步骤 1：规划结构

编写前，规划文档结构：
- 需要哪些章节？
- 每个章节应涵盖哪些主题？
- 逻辑顺序是什么？

### 步骤 2：创建配置文件

创建必要的 `_config.yaml` 文件（**只需创建写作语言的配置文件**）：
1. 根配置（如不存在）
2. 语言根配置（如 `cn/_config.yaml`）
3. 章节配置（如 `cn/documentation/_config.yaml`）

**注意**：不要创建其他语言的配置文件（如 `en/`、`ja/`），OBook 会自动处理。

### 步骤 3：编写 Markdown 文件

对于每个主题：
1. 创建新的 `.md` 文件
2. 编写清晰、简洁的内容
3. 在适当的地方包含代码示例
4. 添加相关文档的链接

### 步骤 4：更新导航

更新相关的 `_config.yaml`，将新文件包含在导航中。

## AI 助手提示

1. **理解上下文**：生成文档前，了解：
   - 项目是关于什么的？
   - 目标受众是谁？
   - 文档目标是什么？

2. **遵循现有模式**：查看项目中现有的文档：
   - 匹配写作风格
   - 使用相似的格式
   - 遵循命名约定

3. **保持简单**：
   - 使用清晰、简单的语言
   - 除非必要，避免术语
   - 解释技术术语

4. **提供示例**：
   - 为技术主题包含代码示例
   - 适当时使用交互式演示
   - 展示基本和高级用法

5. **链接相关内容**：
   - 添加相关文档的链接
   - 在页面之间创建逻辑流程
   - 帮助用户导航文档

6. **多语言文档**：
   - **重要**：只生成写作语言的文档（如 `cn/` 目录）
   - 不要生成其他语言的文档，由 OBook 应用自动翻译
   - 编写易于翻译的内容
   - 避免特定文化的引用
   - 使用清晰、明确的语言

## 示例：创建新章节

创建名为"高级特性"的新章节：

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

4. 更新 `cn/_config.yaml` 以包含新章节：
   ```yaml
   header:
     - name: 教程
       url: ./documentation/_config.yaml
     - name: API
       url: ./api/_config.yaml
     - name: 高级特性
       url: ./advanced-features/_config.yaml
   ```

## 验证清单

完成文档前检查：

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
