/**
 * Content Extractor Service
 * Extracts page content from browser tabs using script injection
 * with fallback for restricted pages
 */

/**
 * URLs that cannot be accessed by content scripts
 */
const RESTRICTED_URL_PATTERNS = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^edge:\/\//,
  /^about:/,
  /^view-source:/,
  /^file:\/\//,
  /^data:/,
  /^javascript:/,
  /^chrome-search:\/\//,
  /^chrome-devtools:\/\//,
];

/**
 * Check if a URL is restricted (cannot inject content scripts)
 * @param {string} url - URL to check
 * @returns {boolean} True if restricted
 */
export function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if a URL is a browser internal page (cannot extract AND cannot search)
 * These are pages like chrome://, edge://, about: that have no web equivalent
 * @param {string} url - URL to check
 * @returns {boolean} True if browser internal
 */
export function isBrowserInternalUrl(url) {
  if (!url) return true;
  return /^(chrome|chrome-extension|moz-extension|edge|about|chrome-search|chrome-devtools):\/\//i.test(url);
}

/**
 * Check if a URL is searchable by AI (has a web-accessible equivalent)
 * HTTP/HTTPS URLs can be searched by AI models with web search capabilities
 * @param {string} url - URL to check
 * @returns {boolean} True if AI can potentially search this URL
 */
export function isSearchableUrl(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

/**
 * Content extraction script to be injected into pages
 * This runs in the context of the web page
 */
function getContentExtractionScript() {
  return () => {
    try {
      // Get page text content
      const getTextContent = () => {
        // Remove script, style, and other non-content elements
        const clone = document.body.cloneNode(true);
        const elementsToRemove = clone.querySelectorAll(
          'script, style, noscript, iframe, svg, canvas, video, audio, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], .advertisement, .ad, #ads, .social-share, .comments'
        );
        elementsToRemove.forEach(el => el.remove());
        
        // Get text and clean it up
        let text = clone.innerText || clone.textContent || '';
        
        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // Limit to reasonable length (first ~15000 chars to stay within token limits)
        if (text.length > 15000) {
          text = text.substring(0, 15000) + '... [content truncated]';
        }
        
        return text;
      };

      // Get page metadata
      const getMeta = () => {
        const meta = {
          title: document.title,
          description: '',
          keywords: '',
          author: '',
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
        };
        
        // Get meta tags
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
          const name = (tag.getAttribute('name') || tag.getAttribute('property') || '').toLowerCase();
          const content = tag.getAttribute('content') || '';
          
          if (name === 'description') meta.description = content;
          if (name === 'keywords') meta.keywords = content;
          if (name === 'author') meta.author = content;
          if (name === 'og:title') meta.ogTitle = content;
          if (name === 'og:description') meta.ogDescription = content;
          if (name === 'og:image') meta.ogImage = content;
        });
        
        return meta;
      };

      // Get main images
      const getImages = () => {
        const images = [];
        const imgElements = document.querySelectorAll('img');
        
        imgElements.forEach(img => {
          // Only include images with reasonable size and valid src
          const src = img.src || img.dataset.src;
          if (!src || src.startsWith('data:')) return;
          
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;
          
          // Skip tiny images (likely icons/tracking pixels)
          if (width < 100 || height < 100) return;
          
          // Skip images without alt text that are likely decorative
          const alt = img.alt || '';
          
          images.push({
            src,
            alt,
            width,
            height,
          });
        });
        
        // Limit to top 10 images
        return images.slice(0, 10);
      };

      // Get headings structure
      const getHeadings = () => {
        const headings = [];
        const headingElements = document.querySelectorAll('h1, h2, h3');
        
        headingElements.forEach(h => {
          const text = h.innerText?.trim();
          if (text && text.length > 0 && text.length < 200) {
            headings.push({
              level: parseInt(h.tagName[1]),
              text,
            });
          }
        });
        
        // Limit to first 20 headings
        return headings.slice(0, 20);
      };

      // Get links
      const getLinks = () => {
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        linkElements.forEach(a => {
          const href = a.href;
          const text = a.innerText?.trim();
          
          // Skip empty, anchor, or javascript links
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
          if (!text || text.length === 0) return;
          
          links.push({
            href,
            text: text.substring(0, 100), // Limit text length
          });
        });
        
        // Limit to first 30 links
        return links.slice(0, 30);
      };

      return {
        success: true,
        content: getTextContent(),
        meta: getMeta(),
        images: getImages(),
        headings: getHeadings(),
        links: getLinks(),
        url: window.location.href,
        title: document.title,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: window.location.href,
        title: document.title,
      };
    }
  };
}

/**
 * Extract content from a single tab
 * @param {number} tabId - Chrome tab ID
 * @returns {Promise<Object>} Extracted content or error
 */
export async function extractTabContent(tabId) {
  // Get tab info FIRST, outside try-catch to ensure we always have URL/title
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (e) {
    return {
      success: false,
      error: 'Tab no longer exists',
      tabId,
      url: null,
      title: null,
    };
  }

  // Base result that ALL paths will include - ensures URL/title never lost
  const baseResult = {
    tabId,
    url: tab.url || null,
    title: tab.title || null,
  };

  // Check if URL is a browser internal page (cannot extract OR search)
  if (isBrowserInternalUrl(tab.url)) {
    return {
      ...baseResult,
      success: false,
      restricted: true,
      browserInternal: true,
      error: 'Cannot access content of browser internal page',
    };
  }

  // Check if URL is restricted but still searchable (e.g., file://, data:)
  if (isRestrictedUrl(tab.url)) {
    return {
      ...baseResult,
      success: false,
      restricted: true,
      browserInternal: false,
      searchable: isSearchableUrl(tab.url),
      error: 'Cannot access content of restricted page',
    };
  }

  // Try to inject and execute content script
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: getContentExtractionScript(),
    });

    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      return {
        ...baseResult,
        ...result,
        success: true,
      };
    }

    // Script executed but returned no result
    return {
      ...baseResult,
      success: false,
      searchable: isSearchableUrl(tab.url),
      error: 'Failed to extract content - empty response',
    };
  } catch (error) {
    // Extraction failed, but we still have URL/title for AI to search
    const isSearchable = isSearchableUrl(tab.url);
    
    if (error.message?.includes('Cannot access')) {
      return {
        ...baseResult,
        success: false,
        restricted: true,
        searchable: isSearchable,
        error: 'Page is protected or not accessible',
      };
    }

    return {
      ...baseResult,
      success: false,
      searchable: isSearchable,
      error: error.message || 'Unknown error during extraction',
    };
  }
}

/**
 * Extract content from multiple tabs with progress callback
 * @param {number[]} tabIds - Array of tab IDs
 * @param {Function} onProgress - Progress callback (current, total, result)
 * @returns {Promise<Object[]>} Array of extraction results
 */
export async function extractMultipleTabs(tabIds, onProgress = null) {
  const results = [];
  const total = tabIds.length;
  
  for (let i = 0; i < tabIds.length; i++) {
    const tabId = tabIds[i];
    const result = await extractTabContent(tabId);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, total, result);
    }
    
    // Small delay between extractions to avoid overwhelming the browser
    if (i < tabIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Format extracted content for AI consumption
 * @param {Object[]} extractedTabs - Array of extraction results
 * @returns {string} Formatted content string
 */
export function formatExtractedContentForAI(extractedTabs) {
  const sections = [];
  
  extractedTabs.forEach((tab, index) => {
    const section = [];
    section.push(`\n=== TAB ${index + 1}: ${tab.title || 'Untitled'} ===`);
    section.push(`URL: ${tab.url || 'Unknown'}`);
    
    if (tab.success) {
      section.push('Status: CONTENT EXTRACTED SUCCESSFULLY');
      
      // Add metadata
      if (tab.meta) {
        if (tab.meta.description) {
          section.push(`Description: ${tab.meta.description}`);
        }
        if (tab.meta.author) {
          section.push(`Author: ${tab.meta.author}`);
        }
      }
      
      // Add headings structure
      if (tab.headings && tab.headings.length > 0) {
        section.push('\nPage Structure:');
        tab.headings.forEach(h => {
          const indent = '  '.repeat(h.level - 1);
          section.push(`${indent}${'#'.repeat(h.level)} ${h.text}`);
        });
      }
      
      // Add main content
      if (tab.content) {
        section.push('\nContent:');
        section.push(tab.content);
      }
      
      // Add images
      if (tab.images && tab.images.length > 0) {
        section.push('\nImages found:');
        tab.images.forEach((img, i) => {
          section.push(`  ${i + 1}. ${img.alt || 'No description'} (${img.width}x${img.height})`);
          section.push(`     URL: ${img.src}`);
        });
      }
    } else {
      // Extraction failed - categorize the failure
      if (tab.browserInternal) {
        // Browser internal pages (chrome://, about:, etc.) - truly inaccessible
        section.push('Status: BROWSER INTERNAL PAGE');
        section.push('This is a browser configuration/internal page that cannot be accessed or searched.');
        section.push('Skip this tab in your analysis or note it as a browser page.');
      } else if (tab.searchable) {
        // Web URL that failed extraction but can be searched by AI
        section.push('Status: EXTRACTION FAILED - WEB SEARCH RECOMMENDED');
        section.push('>>> IMPORTANT: Content extraction failed, but this is a valid web URL.');
        section.push('>>> Please use your web search capabilities to look up this URL directly.');
        section.push(`>>> Search for: ${tab.url}`);
        section.push('Include the searched information in your analysis.');
      } else if (tab.restricted) {
        // Restricted but not browser internal (file://, data:, etc.)
        section.push('Status: RESTRICTED PAGE');
        section.push('This page type cannot be accessed by the extension.');
      } else {
        // Generic failure
        section.push('Status: EXTRACTION FAILED');
        section.push(`Error: ${tab.error || 'Unknown error'}`);
        if (tab.url && isSearchableUrl(tab.url)) {
          section.push('>>> This appears to be a web URL - try searching it.');
        }
      }
    }
    
    sections.push(section.join('\n'));
  });
  
  return sections.join('\n\n');
}

/**
 * Get a summary of extraction results
 * @param {Object[]} results - Extraction results
 * @returns {Object} Summary statistics
 */
export function getExtractionSummary(results) {
  const successful = results.filter(r => r.success).length;
  const restricted = results.filter(r => r.restricted).length;
  const browserInternal = results.filter(r => r.browserInternal).length;
  const searchable = results.filter(r => !r.success && r.searchable).length;
  const failed = results.filter(r => !r.success && !r.restricted).length;
  
  return {
    total: results.length,
    successful,
    restricted,
    browserInternal,
    searchable,
    failed,
    hasContent: successful > 0,
    hasSearchableUrls: searchable > 0,
  };
}

export default {
  extractTabContent,
  extractMultipleTabs,
  formatExtractedContentForAI,
  getExtractionSummary,
  isRestrictedUrl,
  isBrowserInternalUrl,
  isSearchableUrl,
};

