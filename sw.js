if (location.host.includes("localhost")) {
  importScripts("http://localhost:3002/sw/dist.js");
} else {
  importScripts("https://core.noneos.com/sw/dist.js");
}
