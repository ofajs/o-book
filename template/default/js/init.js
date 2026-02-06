import { getCurrentLang } from "./util.js";

// 保存滚动位置
let scrollTimer = null;

export const init = async (page) => {
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
    // 复原
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
};

export const revoke = async (page) => {
  clearTimeout(scrollTimer);
  sessionStorage.removeItem("page_scrollTop");
};
