# k6 + Grafana Synthetic Monitoring Workshop - Slide Decks

This directory contains Reveal.js-based slide decks for each module of the k6 workshop.

## 📚 Table of Contents

Open `index.html` in your browser to view the complete table of contents with links to all slide decks.

### Quick Start

```bash
# From the docs directory, start a simple HTTP server:
python3 -m http.server 8000

# Or if you have Node.js installed:
npx serve

# Then open http://localhost:8000 in your browser
```

## 📂 Directory Structure

```
docs/
├── index.html                              # Main table of contents
├── common.css                               # Shared styles for all decks
├── common-scripts.js                        # Shared JavaScript for Reveal.js
├── README.md                                # This file
├── 00_Setup_and_Environment/
│   └── index.html                           # Lab 00 slides
├── 01_k6_Fundamentals/
│   └── index.html                           # Lab 01 slides
├── 02_HTTP_Testing_Checks_Thresholds/
│   └── index.html                           # Lab 02 slides
├── 03_Load_Profiles_and_Stages/
│   └── index.html                           # Lab 03 slides
├── 04_Advanced_Scripting/
│   └── index.html                           # Labs 04-05 slides
├── 05_Local_Observability/
│   └── index.html                           # Labs 06-07 slides
├── 06_Cloud_Integration/
│   └── index.html                           # Labs 08-09 slides
├── 07_Synthetic_Monitoring_Basics/
│   └── index.html                           # Labs 10-13 slides
├── 08_Browser_Testing/
│   └── index.html                           # Labs 14-18 slides
├── 09_Synthetic_Advanced_Features/
│   └── index.html                           # Labs 19-23 slides
├── 10_Observability_Integration/
│   └── index.html                           # Labs 24-25 slides
├── 11_DataDog_Migration/
│   └── index.html                           # Labs 26-28 slides
└── 12_Capstone_Project/
    └── index.html                           # Lab 29 slides
```

## 🎨 Module Organization

### Getting Started
- **Lab 00**: Setup and Environment - Pre-lab environment preparation

### Track 1: k6 Load Testing Fundamentals
- **Lab 01**: k6 Fundamentals - VUs, duration, iterations
- **Lab 02**: HTTP Testing, Checks & Thresholds - Validation and pass/fail criteria
- **Lab 03**: Load Profiles and Stages - Realistic load patterns

### Track 2: Advanced k6 Scripting
- **Lab 04**: Advanced Scripting - Groups, tags, parameterization
- **Lab 05**: Local Observability - InfluxDB, Grafana, Prometheus
- **Lab 06**: Cloud Integration - JSON output, k6 Cloud, Grafana Cloud

### Track 3: Grafana Synthetic Monitoring
- **Lab 07**: Synthetic Monitoring Basics - HTTP, DNS, TCP, workflow checks
- **Lab 08**: Browser Testing - k6 browser module, OTEL tracing
- **Lab 09**: Synthetic Advanced Features - Logging, metrics, extensions, SLOs

### Track 4: Production Integration
- **Lab 10**: Observability Integration - k6 Studio, private probes
- **Lab 11**: DataDog Migration - Migrating from DataDog to Grafana
- **Lab 12**: Capstone Project - End-to-end observability implementation

## 🚀 Features

- **Reveal.js 4.3.1** - Modern HTML presentation framework
- **Night theme** - Easy on the eyes for long presentations
- **Syntax highlighting** - JavaScript, YAML, and shell code examples
- **Speaker notes** - Press `s` during presentation to open presenter view
- **Navigation** - Keyboard arrows, links between modules
- **Responsive** - Works on desktop, tablet, and mobile

## ⌨️ Keyboard Shortcuts

During any presentation:

- `→` or `Space` - Next slide
- `←` - Previous slide
- `Home` - First slide
- `End` - Last slide
- `s` - Open speaker notes view
- `f` - Fullscreen mode
- `Esc` - Overview mode (see all slides)
- `?` - Show keyboard shortcuts help

## 🎯 Usage for Instructors

### Presenting

1. Open the table of contents: `docs/index.html`
2. Click on the module you want to present
3. Press `f` for fullscreen mode
4. Press `s` to open speaker notes in a separate window
5. Use arrow keys or click to navigate slides

### Customizing

Each slide deck can be customized by editing the `index.html` file in the module directory. The slides use Markdown within `<textarea data-template>` tags for easy editing.

**Example:**
```html
<section data-markdown>
<textarea data-template>
## Your Slide Title

- Bullet point 1
- Bullet point 2

```javascript
// Code example
console.log('Hello k6!');
```

<aside class="notes">
Speaker notes go here. Press 's' to view during presentation.
</aside>
</textarea>
</section>
```

### Updating Styles

Edit `common.css` to change styles across all slide decks. This ensures consistency while allowing per-module customization when needed.

## 📖 Related Resources

- **Lab Materials**: See the `../labs/` directory for hands-on exercises
- **Scripts**: See the `../scripts/` directory for k6 test scripts
- **Infrastructure**: See the `../infra/` directory for Docker Compose setup
- **k6 Documentation**: https://k6.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **Reveal.js Documentation**: https://revealjs.com/

## 🤝 Contributing

When adding new slides:

1. Follow the existing structure and naming conventions
2. Use the night theme for consistency
3. Include speaker notes for all slides
4. Add navigation links (All Slides, Prev, Next)
5. Test in multiple browsers
6. Update the table of contents `index.html`

## 📝 License

This workshop is provided for Grafana SE training and customer workshops.

---

**Built with ❤️ by the Grafana SE team**
