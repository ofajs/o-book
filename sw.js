let version = "";
if (globalThis.serviceWorker) {
  // 在 chrome 和 safari 内
  // 从 serviceWorker.scriptURL 上获取 v 参数版本
  const urlParams = new URLSearchParams(
    new URL(serviceWorker.scriptURL).search,
  );

  version = urlParams.get("v") || "";
} else {
  // firefox内没有serviceWorker，则从 location 上获取 v 参数版本
  const urlParams = new URLSearchParams(new URL(location.href).search);
  version = urlParams.get("v") || "";
}

globalThis.SERVER_OPTIONS = {
  useNosTool: true,
};

if (location.host.includes("localhost")) {
  importScripts("http://localhost:3002/sw/dist.js");
} else {
  importScripts("https://core.noneos.com/sw/dist.js?v=" + version);
}
