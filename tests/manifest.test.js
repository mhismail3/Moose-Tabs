const fs = require('fs');
const path = require('path');

describe('Manifest V3 Validation', () => {
  let manifest;
  const manifestPath = path.join(__dirname, '../public/manifest.json');

  beforeAll(() => {
    // This test should fail initially - manifest.json doesn't exist yet
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      manifest = null;
    }
  });

  test('manifest.json file should exist', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  test('manifest should be valid JSON', () => {
    expect(manifest).not.toBeNull();
    expect(typeof manifest).toBe('object');
  });

  test('manifest should have correct manifest_version', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('manifest should have required fields', () => {
    expect(manifest.name).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    
    expect(manifest.version).toBeDefined();
    expect(typeof manifest.version).toBe('string');
    expect(manifest.version).toMatch(/^\d+\.\d+(\.\d+)?$/); // Basic version format
    
    expect(manifest.description).toBeDefined();
    expect(typeof manifest.description).toBe('string');
  });

  test('manifest should have background service worker', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBeDefined();
    expect(typeof manifest.background.service_worker).toBe('string');
  });

  test('manifest should have required permissions', () => {
    expect(manifest.permissions).toBeDefined();
    expect(Array.isArray(manifest.permissions)).toBe(true);
    expect(manifest.permissions).toContain('tabs');
    expect(manifest.permissions).toContain('sidePanel');
  });

  test('background service worker file should exist', () => {
    if (manifest && manifest.background && manifest.background.service_worker) {
      const backgroundPath = path.join(__dirname, '../public', manifest.background.service_worker);
      expect(fs.existsSync(backgroundPath)).toBe(true);
    }
  });
});