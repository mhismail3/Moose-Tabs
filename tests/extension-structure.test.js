const fs = require('fs');
const path = require('path');

describe('Extension Structure Validation', () => {
  const publicDir = path.join(__dirname, '../public');
  
  test('public directory should exist', () => {
    expect(fs.existsSync(publicDir)).toBe(true);
  });

  test('index.html should exist for side panel', () => {
    const indexPath = path.join(publicDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('background.js should be a valid JavaScript file', () => {
    const backgroundPath = path.join(publicDir, 'background.js');
    expect(fs.existsSync(backgroundPath)).toBe(true);
    
    const content = fs.readFileSync(backgroundPath, 'utf8');
    expect(content).toContain('chrome.runtime.onInstalled');
    expect(content).toContain('chrome.tabs.onCreated');
    expect(content).toContain('chrome.action.onClicked');
  });

  test('icon files should exist', () => {
    const iconsDir = path.join(publicDir, 'icons');
    expect(fs.existsSync(iconsDir)).toBe(true);
    
    expect(fs.existsSync(path.join(iconsDir, 'icon16.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon48.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon128.png'))).toBe(true);
  });

  test('manifest.json should reference valid files', () => {
    const manifestPath = path.join(publicDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check background service worker exists
    expect(fs.existsSync(path.join(publicDir, manifest.background.service_worker))).toBe(true);
    
    // Check side panel default path exists
    expect(fs.existsSync(path.join(publicDir, manifest.side_panel.default_path))).toBe(true);
    
    // Check icon files exist
    Object.values(manifest.icons).forEach(iconPath => {
      expect(fs.existsSync(path.join(publicDir, iconPath))).toBe(true);
    });
  });
});