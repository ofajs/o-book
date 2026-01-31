export const getCurrentLang = () => {
  if (location.href.includes("$mount-")) {
    const segments = location.href.split("/");
    const websiteIndex = segments.indexOf("website");
    const lang = segments[websiteIndex + 1];
    return lang;
  }

  return "en";
};
