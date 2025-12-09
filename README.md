# 🌳 Moose Tabs - Visualize & Organize Your Browser Tabs

A Chrome extension that transforms your chaotic tab bar into an organized, hierarchical tree view. Visualize tab relationships based on how they were opened, and let AI help you declutter when things get out of hand.

![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🆕 What's New in v2.0

### 🤖 AI Organization Toolkit
Stop manually sorting dozens of tabs. The new AI-powered organizer analyzes your open tabs and suggests logical groupings based on content, domain, or topic.
- **Smart Suggestions**: Ask the AI to organize by project, topic, or workflow
- **Preview Before Applying**: See exactly how tabs will be grouped before committing
- **Chrome Tab Groups Sync**: Apply organization directly to Chrome's native colored tab groups
- **Regenerate with Feedback**: Not happy with a suggestion? Tell the AI to "make fewer groups" or "focus on work tabs" and try again

### 📱 Toolbar Popup View
Don't want to give up screen space for a sidebar? Click the extension icon for a compact dropdown that shows your full tab tree. Both views stay in sync in real-time.

### 🎨 Refreshed Interface
Cleaner spacing, improved hierarchy visualization, and smoother animations. The tree is now easier to scan at a glance.

### ⚙️ Rebuilt Settings
The settings panel has been completely reorganized. AI configuration, appearance, themes, and behavior controls are now in dedicated sections that are easier to navigate.

---

## 🎯 Why Moose Tabs?

Chrome's flat tab bar doesn't reflect how you actually browse. When you click a link, it opens a new tab that's *related* to the original—but that context disappears into the strip. Moose Tabs preserves those relationships in a tree, so you can see which tabs spawned which, close entire research branches at once, and stop hunting for that one tab you know is "somewhere."

## ✨ Key Features

### 🌲 Intelligent Tab Hierarchy
- **Automatic Organization**: Tabs group based on opener relationships
- **Visual Tree Structure**: Parent-child relationships at a glance
- **Multi-Window Support**: Manage tabs across multiple browser windows
- **Real-Time Updates**: Hierarchy updates instantly as you browse

### 🤖 AI-Powered Organization
- **Smart Grouping**: Let AI categorize tabs by topic, project, or domain
- **Multiple Providers**: Works with OpenAI, Anthropic, Gemini, Groq, or OpenRouter
- **BYOK (Bring Your Own Key)**: Your API keys stay on your device—we never see them
- **Chrome Tab Groups**: Sync AI suggestions to native browser groups with colors and names

### 🎨 Flexible Interface
- **Sidebar Panel**: Persistent tree view alongside your browsing
- **Toolbar Popup**: Quick access without sacrificing screen width
- **Expand/Collapse**: Focus on relevant branches
- **Fuzzy Search**: Find tabs by title or URL with character-order matching

### 🛠️ Smart Tab Management
- **Drag & Drop**: Reorganize tabs by dragging to new positions
- **Position-Based Drop Zones**: Drop on left side for sibling, right side for child
- **One-Click Navigation**: Jump to any tab instantly
- **Pinned Tab Constraints**: Respects Chrome's pinned tab ordering rules

### ⚙️ Customization
- **Theme Support**: Auto-detect system theme or set manually
- **Appearance Settings**: Density, favicons, URL display
- **Accessibility**: High contrast mode, reduced motion, screen reader support
- **Behavioral Controls**: Drag sensitivity, expand state defaults

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/moose-tabs-organize-your/ecgdnamlhfodmjokjobadclppaddeond)
2. Click "Add to Chrome"
3. Click the extension icon to open the sidebar panel or popup

### Development Installation
1. Clone this repository
2. Run `npm install` and `npm run build`
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `public/` folder

## 📖 How to Use

### Basic Usage
1. **Install the extension** and click the Moose Tabs icon in your toolbar
2. **Browse naturally**—tabs automatically organize based on opener relationships
3. **View the hierarchy** in the sidebar panel or toolbar popup
4. **Navigate efficiently** by clicking any tab in the tree

### Understanding the Hierarchy
- **Parent tabs**: Tabs that opened other tabs
- **Child tabs**: Tabs opened from parent tabs (links, bookmarks, etc.)
- **Sibling tabs**: Tabs at the same hierarchy level
- **Root tabs**: Top-level tabs with no parent

### Using AI Organization
1. Click the **AI Organize** button in the toolbar
2. Choose a strategy: Smart, Domain, Topic, or Activity
3. Review the suggested groupings in the preview
4. Click **Apply** to reorganize your tabs
5. Optionally sync to Chrome Tab Groups for colored labels in the tab strip

### Drag & Drop
- Drag tabs to reorganize the hierarchy
- Drop on the **left side** of a tab to make it a sibling (same level)
- Drop on the **right side** to make it a child (nested under)
- Visual feedback shows valid drop zones with depth-based colors

## ⚙️ Settings & Configuration

Access settings through the gear icon in the sidebar or popup.

### AI Settings
- **Enable/Disable AI**: Toggle AI features on or off
- **Provider**: Choose OpenRouter, OpenAI, Anthropic, Gemini, Groq, or a custom endpoint
- **API Key**: Enter your key (stored locally, encrypted)
- **Model Selection**: Pick from available models or use auto-selection
- **Organization Strategy**: Default grouping approach (smart, domain, topic, activity)

### Tab Management
- **Default Expand State**: How tab groups appear when loaded
- **Confirm Tab Close**: Show confirmation before closing tabs
- **Drag Sensitivity**: Adjust drag-and-drop responsiveness

### Appearance
- **View Density**: Compact, Normal, or Comfortable spacing
- **Show Tab URLs**: Display full URLs in the tree
- **Show Favicons**: Display website icons
- **Reduced Motion**: Minimize animations for accessibility

### Theme
- **Theme Mode**: Auto (system), Light, or Dark
- **High Contrast**: Enhanced visibility mode

### Search
- **Case Sensitive**: Toggle case-sensitive search
- **Search in URLs**: Include URLs in search results
- **Highlight Results**: Highlight matching text

## 🏗️ Architecture

### Core Components

#### Frontend (React)
- **`src/App.js`**: Main sidebar application
- **`src/PopupApp.js`**: Toolbar popup application
- **`src/components/TabTreeComponent.js`**: Shared tree view component
- **`src/components/TabItem.js`**: Individual tab component with drag-drop
- **`src/components/AIOrganizePanel.js`**: AI organization interface
- **`src/settings/SettingsApp.js`**: Settings interface
- **`src/contexts/SettingsContext.js`**: Settings state management

#### AI Services
- **`src/services/aiService.js`**: Multi-provider AI client (OpenAI, Anthropic, Gemini, etc.)
- **`src/services/tabOrganizer.js`**: Orchestrates AI suggestions and applies organization
- **`src/services/contentExtractor.js`**: Extracts page content for smarter AI context
- **`src/services/tabGroupsService.js`**: Chrome Tab Groups API integration

#### Backend (Service Worker)
- **`public/background.js`**: Chrome extension service worker
- **`public/TabTree.js`**: Tab hierarchy management class
- **`public/tabParity.js`**: Ensures sidebar and browser stay in sync

#### Build System
- **Webpack**: Bundles React applications
- **Babel**: Transpiles JSX and modern JavaScript
- **CSS Loader**: Processes component styles

### Data Flow
1. **Tab Events**: Chrome API events (created, removed, activated, moved)
2. **Background Processing**: Service worker processes events and updates hierarchy
3. **State Management**: TabTree class maintains tab relationships with persistence
4. **UI Updates**: React components receive updates via port connections
5. **User Interaction**: Sidebar/popup actions sent back to background script
6. **AI Integration**: User-initiated organization flows through aiService → tabOrganizer → tabGroupsService

## 🧪 Development

### Prerequisites
- Node.js 16+
- npm or yarn
- Chrome browser

### Setup
```bash
# Clone the repository
git clone https://github.com/mhismail3/moose-tabs.git
cd moose-tabs

# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test

# Development mode (watch for changes)
npm run dev
```

### Project Structure
```
moose-tabs/
├── public/                 # Extension files (load this in Chrome)
│   ├── manifest.json      # Extension manifest
│   ├── background.js      # Service worker
│   ├── TabTree.js         # Tab hierarchy logic
│   ├── tabParity.js       # Browser sync utilities
│   ├── index.html         # Sidebar panel HTML
│   ├── popup.html         # Toolbar popup HTML
│   └── settings.html      # Settings page HTML
├── src/                   # React source code
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── services/          # AI and tab group services
│   ├── settings/          # Settings app
│   ├── styles/            # CSS files
│   └── utils/             # Utility functions
├── tests/                 # Test files
└── docs/                  # Documentation
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test TabTreeComponent

# Run tests in watch mode
npm run test:watch
```

### Building for Production
```bash
# Create production build
npm run build

# The extension will be built in the public/ directory
# Load this directory in Chrome for testing
```

## 🛡️ Privacy & Security

### Data Handling
- **Local Processing**: All tab organization happens locally in your browser
- **No External Servers**: We don't run any servers—your data never leaves your machine
- **No Tracking**: Zero analytics, ads, or user tracking
- **Open Source**: Full source code available for inspection

### AI Privacy (BYOK Model)
- **Your Keys, Your Control**: API keys are stored locally in Chrome's encrypted storage
- **Direct Connection**: AI requests go directly from your browser to your chosen provider
- **No Middleman**: We never see your API keys or the content of your tabs
- **Optional Feature**: AI organization is entirely opt-in; the extension works fully without it

### Permissions Explained
- **`tabs`**: Read tab information and listen for tab events
- **`tabGroups`**: Create and manage Chrome Tab Groups
- **`sidePanel`**: Display the extension in Chrome's sidebar
- **`storage`**: Save user preferences and hierarchy state locally
- **`contextMenus`**: Add settings access to context menu
- **`scripting`**: Inject content script for AI context extraction
- **`activeTab`**: Temporarily access active tab content when user requests AI organization

## 🤝 Contributing

Contributions welcome!

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

### Reporting Issues
- Use the [GitHub Issues](https://github.com/mhismail3/moose-tabs/issues) page
- Include browser version, extension version, and steps to reproduce
- Check existing issues before creating new ones

## 📋 Roadmap

### Planned
- [ ] Keyboard shortcuts for common actions
- [ ] Export/import hierarchy and settings
- [ ] Session snapshots (save and restore tab trees)
- [ ] More theme color options

### Future
- [ ] Cross-browser support (Firefox, Edge)
- [ ] Tab bookmarking from hierarchy
- [ ] Advanced search filters (by date, domain, group)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chrome Extensions API documentation
- React and React Testing Library communities
- All beta testers and contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mhismail3/moose-tabs/issues)
- **Email**: moose.extensions@gmail.com

---

**Transform your browsing from chaotic to organized. Install Moose Tabs today!** 🚀
