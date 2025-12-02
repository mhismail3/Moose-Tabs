import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAIService } from '../services/aiService';
import { getAIPrompts, saveCustomAIPrompt, checkSuperchargedAvailability } from '../utils/settings';
import { useSettings } from '../contexts/SettingsContext';
import './AIActionsPanel.css';

/**
 * AI Actions Panel - Multi-step wizard for executing AI actions on tabs
 * Step 1: Select prompts/actions from grid
 * Step 2: Select tabs to analyze
 * Step 3: View results
 * 
 * Supports "Supercharged" mode with premium API keys for:
 * - Actual page content extraction
 * - Extended thinking/reasoning display
 * - Rich results with images and citations
 */
function AIActionsPanel({ tabs, onClose }) {
  const { settings } = useSettings();
  
  // Wizard state
  const [step, setStep] = useState(1);
  
  // Prompt selection state
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState([]);
  
  // Tab selection state
  const [selectedTabIds, setSelectedTabIds] = useState([]);
  const [tabSearchTerm, setTabSearchTerm] = useState('');
  
  // Results state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // New prompt modal state
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', icon: '✨', prompt: '', description: '' });
  
  // AI availability
  const [aiAvailable, setAiAvailable] = useState(null);
  
  // Supercharged mode state
  const [superchargedAvailable, setSuperchargedAvailable] = useState(null);
  const [superchargedEnabled, setSuperchargedEnabled] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null); // 'extracting', 'thinking', 'generating'
  const [progress, setProgress] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState(null);

  // Load prompts and check AI availability on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Load all prompts
        const prompts = await getAIPrompts();
        setAvailablePrompts(prompts);
        
        // Check AI availability
        const aiService = getAIService();
        const availability = await aiService.isAvailable();
        setAiAvailable(availability);
        
        // Check supercharged availability
        const superAvail = await checkSuperchargedAvailability();
        setSuperchargedAvailable(superAvail);
        
        // Auto-enable supercharged if available and setting is enabled
        if (superAvail.available && settings?.ai?.superchargedMode) {
          setSuperchargedEnabled(true);
        }
      } catch (error) {
        console.error('Failed to initialize AI Actions panel:', error);
        setAiAvailable({ available: false, reason: error.message });
      }
    };
    init();
  }, [settings]);

  // Flatten tabs helper
  const flattenTabs = useCallback((tabHierarchy) => {
    const flat = [];
    const traverse = (items) => {
      for (const item of items) {
        flat.push({
          id: item.id,
          title: item.title,
          url: item.url,
          favIconUrl: item.favIconUrl,
          pinned: item.pinned,
          windowId: item.windowId
        });
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(tabHierarchy);
    return flat;
  }, []);

  // Get flat list of all tabs
  const allTabs = useMemo(() => flattenTabs(tabs), [tabs, flattenTabs]);

  // Filter tabs by search term
  const filteredTabs = useMemo(() => {
    if (!tabSearchTerm.trim()) return allTabs;
    const search = tabSearchTerm.toLowerCase();
    return allTabs.filter(tab => 
      tab.title?.toLowerCase().includes(search) ||
      tab.url?.toLowerCase().includes(search)
    );
  }, [allTabs, tabSearchTerm]);

  // Group tabs by window
  const groupedTabs = useMemo(() => {
    const groups = new Map();
    filteredTabs.forEach(tab => {
      if (!groups.has(tab.windowId)) {
        groups.set(tab.windowId, []);
      }
      groups.get(tab.windowId).push(tab);
    });
    return Array.from(groups.entries()).map(([windowId, windowTabs]) => ({
      windowId,
      tabs: windowTabs
    }));
  }, [filteredTabs]);

  // Get selected prompts objects
  const selectedPrompts = useMemo(() => {
    return availablePrompts.filter(p => selectedPromptIds.includes(p.id));
  }, [availablePrompts, selectedPromptIds]);

  // Get selected tabs objects
  const selectedTabs = useMemo(() => {
    return allTabs.filter(t => selectedTabIds.includes(t.id));
  }, [allTabs, selectedTabIds]);

  // Toggle prompt selection
  const togglePrompt = (promptId) => {
    setSelectedPromptIds(prev => {
      if (prev.includes(promptId)) {
        return prev.filter(id => id !== promptId);
      }
      return [...prev, promptId];
    });
  };

  // Toggle tab selection
  const toggleTab = (tabId) => {
    setSelectedTabIds(prev => {
      if (prev.includes(tabId)) {
        return prev.filter(id => id !== tabId);
      }
      return [...prev, tabId];
    });
  };

  // Select all visible tabs
  const selectAllTabs = () => {
    const visibleIds = filteredTabs.map(t => t.id);
    setSelectedTabIds(prev => {
      const newIds = new Set([...prev, ...visibleIds]);
      return Array.from(newIds);
    });
  };

  // Clear tab selection
  const clearTabSelection = () => {
    setSelectedTabIds([]);
  };

  // Select tabs in a specific window
  const selectWindowTabs = (windowId) => {
    const windowTabIds = allTabs.filter(t => t.windowId === windowId).map(t => t.id);
    setSelectedTabIds(prev => {
      const newIds = new Set([...prev, ...windowTabIds]);
      return Array.from(newIds);
    });
  };

  // Execute AI actions
  const executeActions = async () => {
    if (selectedPrompts.length === 0 || selectedTabs.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    setCurrentPhase(null);
    setProgress(0);
    setExtractionStatus(null);
    setStep(3);

    try {
      const aiService = getAIService();
      let result;
      
      if (superchargedEnabled && superchargedAvailable?.available) {
        // Use supercharged mode
        result = await aiService.executeSuperchargedActions(
          selectedTabs, 
          selectedPrompts,
          {},
          {
            onPhase: (phase) => {
              setCurrentPhase(phase);
            },
            onProgress: (p) => {
              setProgress(p);
            },
            onExtractionProgress: (current, total, tabResult) => {
              setExtractionStatus({ current, total, lastTab: tabResult?.title || 'Unknown' });
            }
          }
        );
      } else {
        // Use regular mode
        result = await aiService.executeActions(selectedTabs, selectedPrompts);
      }
      
      if (result.success) {
        setResults(result);
      } else {
        setError(result.error || 'Failed to execute actions');
      }
    } catch (err) {
      console.error('AI actions failed:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setCurrentPhase(null);
      setProgress(0);
    }
  };

  // Save new custom prompt
  const handleSaveNewPrompt = async () => {
    if (!newPrompt.name.trim() || !newPrompt.prompt.trim()) return;
    
    try {
      await saveCustomAIPrompt({
        name: newPrompt.name.trim(),
        icon: newPrompt.icon || '✨',
        prompt: newPrompt.prompt.trim(),
        description: newPrompt.description.trim() || newPrompt.prompt.substring(0, 50) + '...',
        category: 'custom'
      });
      
      // Reload prompts
      const prompts = await getAIPrompts();
      setAvailablePrompts(prompts);
      
      // Reset and close modal
      setNewPrompt({ name: '', icon: '✨', prompt: '', description: '' });
      setShowNewPromptModal(false);
    } catch (err) {
      console.error('Failed to save prompt:', err);
    }
  };

  // Reset and run again
  const runAgain = () => {
    setResults(null);
    setError(null);
    setStep(2);
  };

  // Go back to previous step
  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Select Actions';
      case 2: return 'Select Tabs';
      case 3: return 'Results';
      default: return 'AI Actions';
    }
  };

  return (
    <div className="ai-actions-panel">
      {/* Header */}
      <div className="ai-actions-header">
        <div className="ai-actions-header-left">
          {step > 1 && !isLoading && (
            <button className="ai-actions-back-btn" onClick={goBack} title="Go back">
              ←
            </button>
          )}
          <h3>{getStepTitle()}</h3>
          {superchargedEnabled && (
            <span className="supercharged-indicator">⚡ Supercharged</span>
          )}
        </div>
        <div className="ai-actions-header-right">
          <div className="ai-actions-steps">
            <span className={`step-dot ${step >= 1 ? 'active' : ''}`} title="Select actions" />
            <span className={`step-dot ${step >= 2 ? 'active' : ''}`} title="Select tabs" />
            <span className={`step-dot ${step >= 3 ? 'active' : ''}`} title="Results" />
          </div>
          <button className="ai-actions-close-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ai-actions-content">
        {/* AI Not Available Warning */}
        {aiAvailable && !aiAvailable.available && (
          <div className="ai-actions-warning">
            <span className="ai-warning-icon">⚠️</span>
            <div>
              <strong>AI not configured</strong>
              <p>{aiAvailable.reason}</p>
              <button 
                className="ai-btn ai-btn-small ai-btn-primary"
                onClick={() => chrome.runtime.openOptionsPage()}
              >
                Open Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Prompt Selection */}
        {step === 1 && aiAvailable?.available && (
          <div className="ai-actions-step step-prompts">
            <p className="ai-actions-description">
              Choose one or more actions to perform on your tabs. Select multiple to combine them.
            </p>
            
            {/* Supercharged Mode Toggle */}
            {superchargedAvailable?.available && (
              <div className="supercharged-toggle-container">
                <label className="supercharged-toggle">
                  <input 
                    type="checkbox" 
                    checked={superchargedEnabled}
                    onChange={(e) => setSuperchargedEnabled(e.target.checked)}
                  />
                  <span className="supercharged-slider"></span>
                  <span className="supercharged-label">
                    <span className="supercharged-icon">⚡</span>
                    Supercharged Mode
                    <span className="supercharged-badge">PRO</span>
                  </span>
                </label>
                <p className="supercharged-description">
                  {superchargedEnabled 
                    ? `Enabled: Deep analysis with actual page content (${superchargedAvailable.provider})`
                    : 'Analyzes actual page content for richer insights'
                  }
                  {superchargedAvailable.supportsThinking && superchargedEnabled && (
                    <span className="thinking-badge">+ AI Reasoning</span>
                  )}
                </p>
              </div>
            )}
            
            <div className="ai-prompts-grid">
              {availablePrompts.map(prompt => (
                <div
                  key={prompt.id}
                  className={`ai-prompt-card ${selectedPromptIds.includes(prompt.id) ? 'selected' : ''}`}
                  onClick={() => togglePrompt(prompt.id)}
                  title={prompt.description || prompt.prompt}
                >
                  <span className="ai-prompt-icon">{prompt.icon}</span>
                  <span className="ai-prompt-name">{prompt.name}</span>
                  {selectedPromptIds.includes(prompt.id) && (
                    <span className="ai-prompt-check">✓</span>
                  )}
                </div>
              ))}
              
              {/* Add New Prompt Card */}
              <div
                className="ai-prompt-card ai-prompt-add"
                onClick={() => setShowNewPromptModal(true)}
                title="Create a custom action"
              >
                <span className="ai-prompt-icon">+</span>
                <span className="ai-prompt-name">New Action</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Tab Selection */}
        {step === 2 && (
          <div className="ai-actions-step step-tabs">
            <div className="ai-tabs-header">
              <div className="ai-tabs-search">
                <input
                  type="text"
                  placeholder="Search tabs..."
                  value={tabSearchTerm}
                  onChange={(e) => setTabSearchTerm(e.target.value)}
                  className="ai-tabs-search-input"
                />
                {tabSearchTerm && (
                  <button 
                    className="ai-tabs-search-clear"
                    onClick={() => setTabSearchTerm('')}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="ai-tabs-quick-actions">
                <button 
                  className="ai-btn ai-btn-small ai-btn-secondary"
                  onClick={selectAllTabs}
                >
                  Select All
                </button>
                <button 
                  className="ai-btn ai-btn-small ai-btn-secondary"
                  onClick={clearTabSelection}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="ai-tabs-list">
              {groupedTabs.map(group => (
                <div key={group.windowId} className="ai-tabs-window-group">
                  <div className="ai-tabs-window-header">
                    <span>Window {group.windowId}</span>
                    <button 
                      className="ai-tabs-window-select"
                      onClick={() => selectWindowTabs(group.windowId)}
                    >
                      Select window
                    </button>
                  </div>
                  {group.tabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`ai-tab-item ${selectedTabIds.includes(tab.id) ? 'selected' : ''}`}
                      onClick={() => toggleTab(tab.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTabIds.includes(tab.id)}
                        onChange={() => toggleTab(tab.id)}
                        className="ai-tab-checkbox"
                      />
                      <span className="ai-tab-title" title={tab.url}>
                        {tab.title || 'Untitled'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              
              {filteredTabs.length === 0 && (
                <div className="ai-tabs-empty">
                  {tabSearchTerm ? 'No tabs match your search' : 'No tabs available'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="ai-actions-step step-results">
            {isLoading && (
              <div className="ai-actions-loading">
                {/* Supercharged Progress Display */}
                {superchargedEnabled && currentPhase && (
                  <div className="supercharged-progress">
                    <div className={`progress-phase ${currentPhase === 'extracting' ? 'active' : progress > 30 ? 'done' : ''}`}>
                      <span className="phase-icon">📄</span>
                      <span className="phase-label">Fetching page content</span>
                      {currentPhase === 'extracting' && extractionStatus && (
                        <span className="phase-detail">
                          {extractionStatus.current}/{extractionStatus.total}
                        </span>
                      )}
                      {progress > 30 && <span className="phase-check">✓</span>}
                    </div>
                    <div className={`progress-phase ${currentPhase === 'thinking' ? 'active' : progress > 50 ? 'done' : ''}`}>
                      <span className="phase-icon">🧠</span>
                      <span className="phase-label">Analyzing & reasoning</span>
                      {progress > 50 && <span className="phase-check">✓</span>}
                    </div>
                    <div className={`progress-phase ${currentPhase === 'generating' ? 'active' : progress >= 100 ? 'done' : ''}`}>
                      <span className="phase-icon">✨</span>
                      <span className="phase-label">Generating results</span>
                      {progress >= 100 && <span className="phase-check">✓</span>}
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
                
                {/* Standard Loading Display */}
                {!superchargedEnabled && (
                  <>
                    <div className="ai-spinner"></div>
                    <p>Analyzing {selectedTabs.length} tab{selectedTabs.length !== 1 ? 's' : ''}...</p>
                    <p className="ai-loading-actions">
                      {selectedPrompts.map(p => p.name).join(' + ')}
                    </p>
                  </>
                )}
              </div>
            )}

            {error && !isLoading && (
              <div className="ai-actions-error">
                <span className="ai-error-icon">❌</span>
                <p>{error}</p>
                <div className="ai-error-actions">
                  <button 
                    className="ai-btn ai-btn-primary ai-btn-small"
                    onClick={runAgain}
                  >
                    Try Again
                  </button>
                  <button 
                    className="ai-btn ai-btn-secondary ai-btn-small"
                    onClick={() => setStep(1)}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {results && !isLoading && (
              <div className="ai-actions-results">
                <div className="ai-results-meta">
                  <span>Analyzed {results.tabCount} tab{results.tabCount !== 1 ? 's' : ''}</span>
                  <span className="ai-results-separator">•</span>
                  <span>{results.actions?.join(' + ')}</span>
                  {results.supercharged && (
                    <>
                      <span className="ai-results-separator">•</span>
                      <span className="supercharged-result-badge">⚡ Supercharged</span>
                    </>
                  )}
                </div>
                
                {/* Thinking Display for Supercharged Mode */}
                {results.thinking && results.thinking.length > 0 && (
                  <ThinkingDisplay thinkingBlocks={results.thinking} />
                )}
                
                {/* Extraction Summary */}
                {results.extractionSummary && (
                  <div className="extraction-summary">
                    <span className="extraction-stat">
                      📄 {results.extractionSummary.successful} pages extracted
                    </span>
                    {results.extractionSummary.restricted > 0 && (
                      <span className="extraction-stat restricted">
                        🔒 {results.extractionSummary.restricted} restricted
                      </span>
                    )}
                  </div>
                )}
                
                <div className="ai-results-content">
                  <ResultsRenderer 
                    content={results.response} 
                    isSupercharged={results.supercharged}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with navigation/actions */}
      <div className="ai-actions-footer">
        {step === 1 && aiAvailable?.available && (
          <>
            <span className="ai-actions-selection-count">
              {selectedPromptIds.length} action{selectedPromptIds.length !== 1 ? 's' : ''} selected
            </span>
            <button
              className="ai-btn ai-btn-primary"
              onClick={() => setStep(2)}
              disabled={selectedPromptIds.length === 0}
            >
              Next: Select Tabs →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <span className="ai-actions-selection-count">
              {selectedTabIds.length} tab{selectedTabIds.length !== 1 ? 's' : ''} selected
              {superchargedEnabled && ' (Supercharged)'}
            </span>
            <button
              className={`ai-btn ${superchargedEnabled ? 'ai-btn-supercharged' : 'ai-btn-primary'}`}
              onClick={executeActions}
              disabled={selectedTabIds.length === 0 || selectedPromptIds.length === 0}
            >
              {superchargedEnabled ? '⚡ Run Supercharged' : 'Run Actions ✨'}
            </button>
          </>
        )}

        {step === 3 && !isLoading && (
          <>
            <button
              className="ai-btn ai-btn-secondary"
              onClick={runAgain}
            >
              Run Again
            </button>
            <button
              className="ai-btn ai-btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </>
        )}
      </div>

      {/* New Prompt Modal */}
      {showNewPromptModal && (
        <div className="ai-modal-overlay" onClick={() => setShowNewPromptModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h4>Create Custom Action</h4>
              <button 
                className="ai-modal-close"
                onClick={() => setShowNewPromptModal(false)}
              >
                ×
              </button>
            </div>
            <div className="ai-modal-content">
              <div className="ai-modal-field">
                <label>Icon (emoji)</label>
                <input
                  type="text"
                  value={newPrompt.icon}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, icon: e.target.value }))}
                  maxLength={2}
                  className="ai-modal-input ai-modal-input-small"
                />
              </div>
              <div className="ai-modal-field">
                <label>Name</label>
                <input
                  type="text"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Find Resources"
                  className="ai-modal-input"
                />
              </div>
              <div className="ai-modal-field">
                <label>Short Description</label>
                <input
                  type="text"
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description shown on hover"
                  className="ai-modal-input"
                />
              </div>
              <div className="ai-modal-field">
                <label>Prompt Instructions</label>
                <textarea
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Write the instructions for what the AI should analyze or do with the selected tabs..."
                  className="ai-modal-textarea"
                  rows={4}
                />
              </div>
            </div>
            <div className="ai-modal-footer">
              <button 
                className="ai-btn ai-btn-secondary"
                onClick={() => setShowNewPromptModal(false)}
              >
                Cancel
              </button>
              <button 
                className="ai-btn ai-btn-primary"
                onClick={handleSaveNewPrompt}
                disabled={!newPrompt.name.trim() || !newPrompt.prompt.trim()}
              >
                Save Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Thinking Display Component - Shows model reasoning in collapsible sections
 */
function ThinkingDisplay({ thinkingBlocks }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!thinkingBlocks || thinkingBlocks.length === 0) return null;
  
  return (
    <div className="thinking-container">
      <button 
        className="thinking-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="thinking-toggle-icon">{isExpanded ? '▼' : '►'}</span>
        <span className="thinking-toggle-label">🧠 Model Reasoning</span>
        <span className="thinking-count">{thinkingBlocks.length} step{thinkingBlocks.length !== 1 ? 's' : ''}</span>
      </button>
      
      {isExpanded && (
        <div className="thinking-content">
          {thinkingBlocks.map((block, i) => (
            <div key={i} className="thinking-block">
              <div className="thinking-block-header">
                <span className="thinking-step-number">Step {i + 1}</span>
              </div>
              <div className="thinking-block-content">
                {block.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced Results Renderer with support for rich content
 */
function ResultsRenderer({ content, isSupercharged = false }) {
  if (!content) return null;

  // Enhanced markdown parsing for supercharged mode
  const renderContent = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let inBlockquote = false;
    let blockquoteContent = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="ai-results-list">
            {currentList.map((item, i) => (
              <li key={i}>{processInline(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushBlockquote = () => {
      if (blockquoteContent.length > 0) {
        elements.push(
          <blockquote key={`quote-${elements.length}`} className="ai-results-blockquote">
            {blockquoteContent.map((line, i) => (
              <p key={i}>{processInline(line)}</p>
            ))}
          </blockquote>
        );
        blockquoteContent = [];
        inBlockquote = false;
      }
    };

    const processInline = (text) => {
      if (typeof text !== 'string') return text;
      
      // Process images first: ![alt](url)
      const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = imgRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(processTextWithLinks(text.substring(lastIndex, match.index)));
        }
        parts.push(
          <img 
            key={`img-${match.index}`}
            src={match[2]} 
            alt={match[1]} 
            className="result-image"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < text.length) {
        parts.push(processTextWithLinks(text.substring(lastIndex)));
      }
      
      return parts.length > 0 ? parts : processTextWithLinks(text);
    };

    const processTextWithLinks = (text) => {
      if (typeof text !== 'string') return text;
      
      // Process markdown links: [text](url)
      let processed = text.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="result-link">$1<span class="link-icon">↗</span></a>'
      );
      
      // Bold
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic
      processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Code
      processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
      
      return <span dangerouslySetInnerHTML={{ __html: processed }} />;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Blockquotes
      if (trimmed.startsWith('> ')) {
        flushList();
        blockquoteContent.push(trimmed.substring(2));
        inBlockquote = true;
        return;
      } else if (inBlockquote && trimmed !== '') {
        flushBlockquote();
      }
      
      // Headers
      if (trimmed.startsWith('### ')) {
        flushList();
        flushBlockquote();
        elements.push(
          <h5 key={index} className="ai-results-h3">{processInline(trimmed.substring(4))}</h5>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        flushBlockquote();
        elements.push(
          <h4 key={index} className="ai-results-h2">{processInline(trimmed.substring(3))}</h4>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList();
        flushBlockquote();
        elements.push(
          <h3 key={index} className="ai-results-h1">{processInline(trimmed.substring(2))}</h3>
        );
      }
      // Bullet points
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushBlockquote();
        currentList.push(trimmed.substring(2));
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        flushBlockquote();
        currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      }
      // Horizontal rule
      else if (trimmed === '---' || trimmed === '***') {
        flushList();
        flushBlockquote();
        elements.push(<hr key={index} className="ai-results-hr" />);
      }
      // Empty line
      else if (trimmed === '') {
        flushList();
        flushBlockquote();
      }
      // Regular paragraph
      else {
        flushList();
        flushBlockquote();
        elements.push(
          <p key={index} className="ai-results-paragraph">{processInline(trimmed)}</p>
        );
      }
    });

    flushList();
    flushBlockquote();
    return elements;
  };

  return (
    <div className={`ai-results-rendered ${isSupercharged ? 'supercharged-results' : ''}`}>
      {renderContent(content)}
    </div>
  );
}

export default AIActionsPanel;

