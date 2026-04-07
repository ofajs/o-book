# o-md 组件

可以直接使用 o-md 组件，直接在线查阅 markdown 文件，不需要搞乱七八糟的依赖应用什么的。

只需要引用ofa.js，在使用 l-m 引用 o-md 组件文件，即可开始使用 o-md 组件。

```html
<!-- 确保 ofa.js 主体有引用 -->
<script src="https://cdn.jsdelivr.net/gh/ofajs/ofa.js/dist/ofa.min.mjs" type="module"></script>

<!-- 使用 l-m 引用 o-md 组件文件 -->
<l-m src="https://book.ofajs.com/o-md/o-md.html"></l-m>

<!-- 使用 o-md 组件，src设置为 markdown 文件路径，即可在线查阅 markdown 文件内容 -->
<o-md src="./README.md"></o-md>
```

## 使用 view.html 查看器

你也可以直接使用 view.html 查看器，无需额外配置，通过 URL 参数即可直接查看指定的 markdown 文件。

view.html 是基于 `o-md` 组件构建的静态页面，专门用于渲染和展示 markdown 文件。

### 使用方法

在浏览器中访问 view.html，并通过 `link` 参数指定 markdown 文件的路径：

```
https://book.ofajs.com/o-md/view.html?link=https%3A%2F%2Fbook.ofajs.com%2Fo-md%2Fview.html
```

**参数说明：**
- `link`：要查看的 markdown 文件 URL

只需将 `link` 参数的值替换为你要查看的 markdown 文件地址即可。