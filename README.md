# 🌳 Moose Tabs - Visualize & Organize Your Browser Tabs

A Chrome extension that transforms your chaotic tab bar into an organized, hierarchical tree view. Visualize tab relationships based on how they were opened and navigate complex browsing sessions with ease.

![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Single Purpose

**Visualize browser tabs in a hierarchical tree structure** that automatically organizes tabs based on opener relationships. See which tabs opened other tabs at a glance, making it easy to navigate complex browsing sessions with nested tab groups displayed in a clean sidebar panel.

## ✨ Key Features

### 🌲 Intelligent Tab Hierarchy
- **Automatic Organization**: Tabs are grouped based on opener relationships
- **Visual Tree Structure**: Clear parent-child relationships at a glance
- **Multi-Window Support**: Manage tabs across multiple browser windows
- **Real-Time Updates**: Hierarchy updates instantly as you browse

### 🎨 Clean Interface
- **Sidebar Panel**: Access your tab tree without cluttering the main browsing area
- **Expand/Collapse**: Focus on relevant tab groups
- **Search Functionality**: Find tabs quickly by title or URL
- **Responsive Design**: Works at any sidebar width

### 🛠️ Smart Tab Management
- **Drag & Drop**: Reorganize tabs by dragging to new positions
- **Tab Placement Control**: Choose whether new tabs (Cmd+T) appear as children or siblings
- **One-Click Navigation**: Jump to any tab instantly
- **Bulk Operations**: Close entire tab groups efficiently

### ⚙️ Customization Options
- **Theme Support**: Automatic light/dark mode detection
- **Appearance Settings**: Customize density, favicons, and URLs display
- **Accessibility Features**: High contrast mode and screen reader support
- **Behavioral Controls**: Adjust drag sensitivity and tab placement

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/moose-tabs-organize-your/ecgdnamlhfodmjokjobadclppaddeond)
2. Click "Add to Chrome"
3. Click the extension icon to open the sidebar panel

### Development Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. The extension will appear in your extensions list

## 📖 How to Use

### Basic Usage
1. **Install the extension** and click the Moose Tabs icon in your toolbar
2. **Browse naturally** - tabs automatically organize based on opener relationships
3. **View the hierarchy** in the sidebar panel that opens
4. **Navigate efficiently** by clicking any tab in the tree view

### Understanding the Hierarchy
- **Parent tabs**: Tabs that opened other tabs
- **Child tabs**: Tabs opened from parent tabs (links, bookmarks, etc.)
- **Sibling tabs**: Tabs at the same hierarchy level
- **Root tabs**: Top-level tabs with no parent

### Advanced Features

#### Search & Navigation
- Use the search bar to filter tabs by title or URL
- Click any tab in the tree to switch to it

#### Drag & Drop Organization
- Drag tabs to reorganize the hierarchy
- Drop tabs onto other tabs to create parent-child relationships
- Visual feedback shows valid drop zones

## ⚙️ Settings & Configuration

Access settings through:
- Right-click the extension icon → Settings
- Context menu in the sidebar

### Available Settings

#### Tab Management
- **Default Expand State**: How tab groups appear when loaded
- **Confirm Tab Close**: Show confirmation before closing tabs
- **Auto-Group by Domain**: Automatically group tabs from same website
- **Drag Sensitivity**: Adjust drag-and-drop responsiveness

#### Appearance
- **View Density**: Compact, Normal, or Comfortable spacing
- **Show Tab URLs**: Display full URLs in the tree
- **Show Favicons**: Display website icons
- **Reduced Motion**: Minimize animations for accessibility

#### Theme
- **Theme Mode**: Auto (system), Light, or Dark
- **High Contrast**: Enhanced visibility mode

#### Search
- **Case Sensitive**: Toggle case-sensitive search
- **Search in URLs**: Include URLs in search results
- **Highlight Results**: Highlight matching text

## 🏗️ Architecture

### Core Components

#### Frontend (React)
- **`src/App.js`**: Main sidebar application
- **`src/components/TabTreeComponent.js`**: Tree view component
- **`src/components/TabItem.js`**: Individual tab component
- **`src/settings/SettingsApp.js`**: Settings interface
- **`src/contexts/SettingsContext.js`**: Settings state management

#### Backend (Service Worker)
- **`public/background.js`**: Chrome extension service worker
- **`public/TabTree.js`**: Tab hierarchy management class

#### Build System
- **Webpack**: Bundles React applications
- **Babel**: Transpiles JSX and modern JavaScript
- **CSS Loader**: Processes component styles

### Data Flow
1. **Tab Events**: Chrome API events (created, removed, activated)
2. **Background Processing**: Service worker processes events and updates hierarchy
3. **State Management**: TabTree class maintains tab relationships
4. **UI Updates**: React components receive updates via Chrome messaging
5. **User Interaction**: Sidebar actions sent back to background script

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
├── public/                 # Extension files
│   ├── manifest.json      # Extension manifest
│   ├── background.js      # Service worker
│   ├── TabTree.js         # Tab hierarchy logic
│   ├── index.html         # Sidebar panel HTML
│   └── settings.html      # Settings page HTML
├── src/                   # React source code
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── settings/          # Settings app
│   ├── styles/            # CSS files
│   └── utils/             # Utility functions
├── tests/                 # Test files
├── agent-docs/            # Development documentation
└── webstore-assets/       # Chrome Web Store assets
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test TabTreeComponent

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
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
- **No External Servers**: No data is sent to external services
- **No Tracking**: Zero analytics, ads, or user tracking
- **Open Source**: Transparent development process

### Permissions Used
- **`tabs`**: Read tab information and listen for tab events
- **`sidePanel`**: Display the extension in Chrome's sidebar
- **`storage`**: Save user preferences locally
- **`contextMenus`**: Add settings access to context menu

## 🤝 Contributing

We welcome contributions!

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

### Version 1.1 (Planned)
- [ ] Tab groups support
- [ ] Keyboard shortcuts
- [ ] Export/import hierarchy
- [ ] More theme options

### Version 1.2 (Future)
- [ ] Cross-browser support (Firefox, Safari)
- [ ] Session management
- [ ] Tab bookmarking from hierarchy
- [ ] Advanced search filters

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

**Transform your browsing experience from chaotic to organized. Install Moose Tabs today!** 🚀