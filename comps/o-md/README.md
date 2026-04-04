# o-md 组件

可以直接使用 o-md 组件，直接在线查阅 markdown 文件，不需要搞乱七八糟的依赖应用什么的。

只需要引用ofa.js，在使用 l-m 引用 o-md 组件文件，即可开始使用 o-md 组件。

```html
<!-- 确保 ofa.js 主体有引用 -->
<script src="https://cdn.jsdelivr.net/gh/ofajs/ofa.js/dist/ofa.min.mjs" type="module"></script>
<!-- 使用 l-m 引用 o-md 组件文件 -->
<l-m src="./o-md.html"></l-m>
<!-- 使用 o-md 组件，src设置为 markdown 文件路径，即可在线查阅 markdown 文件内容 -->
<o-md src="./README.md"></o-md>
```