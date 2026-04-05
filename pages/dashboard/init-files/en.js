import yaml from "/npm/js-yaml@4.1.1/dist/js-yaml.min.mjs";

const INIT_FILES = {
  "_config.yaml": (projectName, writingLang) =>
    yaml.dump({
      name: projectName,
      writingLang: writingLang,
      primaryLang: "en",
      github: null,
      languages: writingLang === "en" ? ["en"] : [writingLang, "en"],
      logoImg: "./logo.svg",
      logoName: projectName,
      googleAnalytics: null,
    }),

  "{lang}/_config.yaml": () =>
    yaml.dump({
      index: "./index.html",
      header: {
        name: "documentation",
        url: "./documentation/_config.yaml",
      },
    }),

  "{lang}/index.html": (projectName) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <center-block>
      <h2>${projectName}</h2>
      <p>Welcome to the documentation system</p>
      <div style="padding: 16px">
        <p-button size="large">
          <a href="./documentation/introduction.md">Get Started</a>
        </p-button>
      </div>
    </center-block>
  </body>
</html>`,
  "{lang}/documentation/_config.yaml": `- name: introduction
  url: ./introduction.md`,

  "{lang}/documentation/introduction.md": () => `# Welcome

This is your first document.

## Get Started

You can start writing your documentation here.

- Supports standard Markdown syntax
- Can create multi-level directory structures
- Supports code highlighting
`,
};

export default INIT_FILES;
