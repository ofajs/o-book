# o-md Component

[中文版本](./README-cn.md)

You can directly use the o-md component to read markdown files online, without needing messy dependencies or applications.

Simply include ofa.js, then use l-m to reference the o-md component file, and you're ready to start using the o-md component.

```html
<!-- Ensure ofa.js is included -->
<script src="https://cdn.jsdelivr.net/gh/ofajs/ofa.js/dist/ofa.min.mjs" type="module"></script>

<!-- Use l-m to reference the o-md component file -->
<l-m src="https://book.ofajs.com/o-md/o-md.html"></l-m>

<!-- Use the o-md component, set src to the markdown file path to read markdown file content online -->
<o-md src="./README.md"></o-md>
```

## Using the view.html Viewer

You can also directly use the view.html viewer without additional configuration. It allows you to view specified markdown files through URL parameters.

view.html is a static page built based on the `o-md` component, specifically designed for rendering and displaying markdown files.

### Usage

Access view.html in your browser and specify the markdown file path through the `link` parameter:

```
https://book.ofajs.com/o-md/view.html?link=https%3A%2F%2Fbook.ofajs.com%2Fo-md%2Fview.html
```

**Parameter Description:**
- `link`: URL of the markdown file to view

Simply replace the value of the `link` parameter with the address of the markdown file you want to view.