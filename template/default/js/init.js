import { getCurrentLang } from "./util.js";

// 保存滚动位置
let scrollTimer = null;

export const init = async (page, query) => {
  const lang = getCurrentLang();

  const articleConfigData = await fetch(
    import.meta.resolve(`../${lang}/article-config.json`),
  ).then((res) => res.json());

  {
    // 获取上一页下一页的内容
    const { header } = articleConfigData;

    const prefixSrc = page.src.split(lang)[0];
    const currentSrc = page.src.split(lang)[1].replace(/^\//, "");
    const targetHeaderItem = header.find((e) =>
      currentSrc.startsWith(e.prefix),
    );

    if (!targetHeaderItem) {
      return;
    }

    const flatedList = targetHeaderItem.data.flatMap((e) => e.content || [e]);

    const currentIndex = flatedList.findIndex(
      (e) => targetHeaderItem.prefix + e.url === currentSrc,
    );

    if (currentIndex !== -1) {
      const leftItem = flatedList[currentIndex - 1];
      const rightItem = flatedList[currentIndex + 1];

      const footer = page.shadow.$(".footer");

      if (leftItem) {
        footer.push(
          `<p-button variant="text" class="prev-item">
          <n-icon icon="mdi:page-previous" slot="prefix"></n-icon>
          <a href="${prefixSrc + lang}/${targetHeaderItem.prefix + leftItem.url}" olink>${leftItem.name}</a></p-button>`,
        );
      }

      if (rightItem) {
        footer.push(
          `<p-button variant="text" class="next-item">
          <n-icon icon="mdi:page-next" slot="suffix"></n-icon>
          <a href="${prefixSrc + lang}/${targetHeaderItem.prefix + rightItem.url}" olink>${rightItem.name}</a></p-button>`,
        );
      }
    }
  }

  {
    // 给所有a标签添加icon
    page.shadow.all("article a").forEach(($el) => {
      const href = $el.attr("href");
      const urlObj = new URL(href);

      if (location.host !== urlObj.host) {
        $el.push(`<n-icon icon="majesticons:open"></n-icon>`);
      } else {
        const icon = $(
          `<n-icon icon="material-symbols:article-rounded"></n-icon>`,
        );

        // 内部的文章
        $el.ele.prepend(icon.ele);
      }
    });
  }

  {
    // 刷新后复原滚动位置
    if (
      sessionStorage.getItem("page_scrollTop") &&
      sessionStorage.getItem("page_scroll_src") === page.src
    ) {
      page.ele.scrollTop = parseInt(sessionStorage.getItem("page_scrollTop"));
    }

    page.on("scroll", (e) => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        sessionStorage.setItem("page_scrollTop", e.target.scrollTop);
        sessionStorage.setItem("page_scroll_src", page.src);
      }, 300);
    });
  }

  {
    // 给所有code包裹article-code组件
    page.shadow.all("pre code").forEach(($el) => {
      $el.parent.wrap(`<article-code></article-code>`);
    });
  }

  {
    const line = query.index || query.L;
    // 锚点修正
    if (line) {
      const target = page.shadow.$("article")[line - 1];
      if (target) {
        target.ele.scrollIntoView({ behavior: "smooth" });
        target.classList.add("focus-index");
      }
      if (query.search) {
        const searchText = query.search.trim();
        if (searchText && target.ele) {
          const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`(${escapedText})`, "gi");

          const walker = document.createTreeWalker(
            target.ele,
            NodeFilter.SHOW_TEXT,
            null,
            false,
          );

          const textNodes = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent.trim()) {
              textNodes.push(node);
            }
          }

          textNodes.forEach((textNode) => {
            if (regex.test(textNode.textContent)) {
              const span = document.createElement("span");
              span.className = "search-highlight";
              span.innerHTML = textNode.textContent.replace(
                regex,
                '<mark class="search-highlight-mark">$1</mark>',
              );
              textNode.parentNode.replaceChild(span, textNode);
            }
          });
        }
      }
    }
  }

  {
    // 添加地址引用的标识
    const markdownBody = page.shadow.$(".markdown-body");

    const markBtn =
      $(`<p-button icon variant="text" size="small" class="octicon-link-mark">
        <n-icon icon="material-symbols:link"></n-icon>
      </p-button>`);

    if (markdownBody) {
      markdownBody.push(markBtn);
    }

    markBtn.on("click", () => {
      markBtn.html = `<n-icon icon="mdi:success"></n-icon>`;
      markBtn.attr("variant", "contained");
      markBtn.attr("color", "success");

      setTimeout(() => {
        markBtn.html = `<n-icon icon="material-symbols:link"></n-icon>`;
        markBtn.attr("variant", "text");
        markBtn.attr("color", null);
      }, 1000);
    });

    const bodyChilds = markdownBody.slice();

    markdownBody.on("mouseover", (e) => {
      let isChild = false;

      for (const child of bodyChilds) {
        if (child.ele === e.target) {
          isChild = true;
          break;
        }
      }

      if (isChild) {
        markBtn.style.top = e.target.offsetTop + "px";
      }
    });
  }
};

export const revoke = async (page) => {
  clearTimeout(scrollTimer);
  sessionStorage.removeItem("page_scrollTop");
};
