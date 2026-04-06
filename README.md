# OBook 3

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern documentation system built on [ofa.js](https://github.com/ofajs/ofa.js), similar to GitBook.

## Features

- **Zero Installation** - No Node.js, no build tools, no complex setup. Just a Chrome browser and you're ready to go.
- **Local-First Privacy** - All operations run in your browser. Your content never leaves your machine.
- **Markdown to Docs** - Write in Markdown, generate beautiful documentation sites instantly.
- **Built-in AI Translation** - Multi-language support with intelligent AI translation. Only translates new or changed content to save tokens.
- **Live Preview** - See your changes in real-time as you write.
- **Google Analytics Integration** - Track your documentation traffic with built-in analytics support.

## Quick Start

1. Open [OBook](https://book.ofajs.com) in Chrome browser
2. Click "Select Local Directory"
3. Choose or create a project folder
4. Start writing your documentation in Markdown

## Project Structure

```
your-project/
├── _config.yaml      # Project configuration
├── cn/               # Writing language (can be any language)
│   ├── _config.yaml  # Chapter config
│   ├── index.md      # Index page
│   ├── footer.html   # Footer component (optional)
│   └── documentation/
│       ├── _config.yaml
│       └── introduction.md
├── en/               # English content (auto-translated)
└── website/          # Generated static site
```

## Configuration (`_config.yaml`)

```yaml
name: My Documentation
writingLang: cn
languages:
  - cn
  - en
  - ja
```

## Tech Stack

- [ofa.js](https://github.com/ofajs/ofa.js) - Core framework
- [Punch-UI](https://github.com/ofajs/Punch-UI) - UI components
- Markdown rendering with syntax highlighting

## Development

```bash
# Clone the repository
git clone https://github.com/kirakiray/o-book.git

# Install dependencies
npm install

# Start local server
npm run static
```

## License

[MIT](LICENSE)