// 保存滚动位置
let scrollTimer = null;

export const init = async (page) => {
  {
    // 复原
    if (sessionStorage.getItem("page_scrollTop")) {
      page.ele.scrollTop = parseInt(sessionStorage.getItem("page_scrollTop"));
    }

    page.on("scroll", (e) => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        sessionStorage.setItem("page_scrollTop", e.target.scrollTop);
      }, 300);
    });
  }
};

export const revoke = async (page) => {
  clearTimeout(scrollTimer);
  sessionStorage.removeItem("page_scrollTop");
};
