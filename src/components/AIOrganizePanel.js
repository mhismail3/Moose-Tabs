import React, { useState, useEffect, useCallback } from 'react';
import { getTabOrganizer, ORGANIZATION_MODES } from '../services/tabOrganizer';
import { getAIService } from '../services/aiService';
import { TAB_GROUP_COLORS } from '../services/tabGroupsService';
import { useSettings } from '../contexts/SettingsContext';
import './AIOrganizePanel.css';

function AIOrganizePanel({ tabs, onClose }) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [preview, setPreview] = useState(null);
  const [strategy, setStrategy] = useState(settings?.ai?.organizationStrategy || 'smart');
  const [isApplying, setIsApplying] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(null);
  
  // Organization options - default to BOTH for maximum parity
  const [organizationMode, setOrganizationMode] = useState(ORGANIZATION_MODES.BOTH);
  const [collapseGroups, setCollapseGroups] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  
  // Feedback for regeneration
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Check AI availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const aiService = getAIService();
        const availability = await aiService.isAvailable();
        setAiAvailable(availability);
      } catch (error) {
        setAiAvailable({ available: false, reason: error.message });
      }
    };
    checkAvailability();
  }, [settings]);

  // Flatten tabs from hierarchy
  const flattenTabs = useCallback((tabHierarchy) => {
    const flat = [];
    const traverse = (items) => {
      for (const item of items) {
        flat.push({
          id: item.id,
          title: item.title,
          url: item.url,
          favIconUrl: item.favIconUrl,
          pinned: item.pinned
        });
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(tabHierarchy);
    return flat;
  }, []);

  // Count non-pinned tabs
  const nonPinnedCount = flattenTabs(tabs).filter(t => !t.pinned).length;

  // Generate organization suggestion
  const handleGenerateSuggestion = async (userFeedback = null) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    setPreview(null);
    setShowFeedbackInput(false);

    try {
      const flatTabs = flattenTabs(tabs).filter(t => !t.pinned); // Exclude pinned
      const organizer = getTabOrganizer();
      const result = await organizer.generateOrganizationSuggestion(flatTabs, { 
        strategy,
        feedback: userFeedback || feedbackText || null
      });

      if (result.success) {
        setSuggestion(result.suggestion);
        setPreview(result.preview);
        setFeedbackText(''); // Clear feedback after successful generation
      } else {
        setError(result.error || 'Failed to generate organization');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle regenerate with feedback
  const handleRegenerateWithFeedback = () => {
    if (feedbackText.trim()) {
      handleGenerateSuggestion(feedbackText.trim());
    } else {
      setShowFeedbackInput(true);
    }
  };

  // Quick organize by domain with Chrome Tab Groups + Hierarchy
  const handleQuickOrganize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const flatTabs = flattenTabs(tabs).filter(t => !t.pinned);
      const organizer = getTabOrganizer();
      
      // First generate the suggestion
      const result = await organizer.organizeByDomain(flatTabs, {
        createGroups: false, // Don't auto-apply, we'll use applyOrganization
        minTabsForGroup: 2
      });

      if (result.success && result.suggestion) {
        // Apply with BOTH mode for full parity
        const applyResult = await organizer.applyOrganization({
          mode: ORGANIZATION_MODES.BOTH,
          collapseGroups,
          clearExisting
        });

        if (applyResult.success) {
          onClose();
        } else {
          setError(applyResult.errors?.map(e => e.error || e.message).join(', ') || 'Failed to apply');
        }
      } else {
        setError(result.error || 'No groups to create (need 2+ tabs per domain)');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply the suggestion
  const handleApply = async () => {
    setIsApplying(true);
    setError(null);

    try {
      const organizer = getTabOrganizer();
      const result = await organizer.applyOrganization({
        mode: organizationMode,
        collapseGroups,
        clearExisting
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.errors?.map(e => e.error || e.message).join(', ') || 'Failed to apply');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsApplying(false);
    }
  };

  // Reject/cancel
  const handleReject = () => {
    const organizer = getTabOrganizer();
    organizer.rejectSuggestion();
    setSuggestion(null);
    setPreview(null);
  };

  // Remove all groups
  const handleRemoveAllGroups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const organizer = getTabOrganizer();
      await organizer.removeAllGroups();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove groups');
    } finally {
      setIsLoading(false);
    }
  };

  // Flatten hierarchy
  const handleFlatten = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const flatTabs = flattenTabs(tabs);
      const organizer = getTabOrganizer();
      await organizer.flattenHierarchy(flatTabs);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-organize-panel">
      <div className="ai-organize-header">
        <h3>Tab Organization</h3>
        <button className="ai-close-btn" onClick={onClose} title="Close">
          ×
        </button>
      </div>

      <div className="ai-organize-content">
        {/* AI Not Available Warning */}
        {aiAvailable && !aiAvailable.available && (
          <div className="ai-warning">
            <span className="ai-warning-icon">⚠️</span>
            <div>
              <strong>AI not configured</strong>
              <p>You can still use quick domain grouping below.</p>
            </div>
          </div>
        )}

        {/* No Suggestion Yet */}
        {!suggestion && !isLoading && (
          <>
            <p className="ai-organize-description">
              Organize {nonPinnedCount} tabs into Chrome Tab Groups.
              {tabs.some(t => t.pinned) && ' (Pinned tabs cannot be grouped)'}
            </p>

            {/* Strategy Selection (for AI) */}
            {aiAvailable?.available && (
              <div className="ai-strategy-select">
                <label>AI Strategy:</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="smart">Smart (AI decides)</option>
                  <option value="domain">By Domain</option>
                  <option value="topic">By Topic</option>
                  <option value="activity">By Activity</option>
                </select>
              </div>
            )}

            {/* Quick Actions */}
            <div className="ai-section">
              <h4>Quick Actions</h4>
              <div className="ai-organize-actions">
                {aiAvailable?.available && (
                  <button
                    className="ai-btn ai-btn-primary"
                    onClick={handleGenerateSuggestion}
                    disabled={isLoading}
                  >
                    <span className="ai-btn-icon">🤖</span>
                    AI Smart Grouping
                  </button>
                )}

                <button
                  className={`ai-btn ${aiAvailable?.available ? 'ai-btn-secondary' : 'ai-btn-primary'}`}
                  onClick={handleQuickOrganize}
                  disabled={isLoading}
                >
                  <span className="ai-btn-icon">🌐</span>
                  Group by Domain
                </button>
              </div>
            </div>

            {/* Management Actions */}
            <div className="ai-section">
              <h4>Manage Groups</h4>
              <div className="ai-organize-actions ai-actions-small">
                <button
                  className="ai-btn ai-btn-secondary ai-btn-small"
                  onClick={handleRemoveAllGroups}
                  disabled={isLoading}
                >
                  Ungroup All
                </button>
                <button
                  className="ai-btn ai-btn-secondary ai-btn-small"
                  onClick={handleFlatten}
                  disabled={isLoading}
                >
                  Flatten Hierarchy
                </button>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="ai-loading">
            <div className="ai-spinner"></div>
            <p>Organizing tabs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="ai-error">
            <span className="ai-error-icon">❌</span>
            <p>{error}</p>
            <div className="ai-error-actions">
              {(error.includes('disabled') || error.includes('API key') || error.includes('not configured')) ? (
                <button 
                  className="ai-btn ai-btn-primary ai-btn-small" 
                  onClick={() => chrome.runtime.openOptionsPage()}
                >
                  Open Settings
                </button>
              ) : (
                <button 
                  className="ai-btn ai-btn-primary ai-btn-small" 
                  onClick={() => handleGenerateSuggestion()}
                >
                  Try Again
                </button>
              )}
              <button className="ai-btn ai-btn-secondary ai-btn-small" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && !isLoading && (
          <div className="ai-preview">
            <h4>Preview Tab Groups</h4>
            
            <div className="ai-preview-tree">
              {preview.map((group, idx) => (
                <PreviewGroup 
                  key={idx} 
                  group={group} 
                  colorIndex={idx}
                />
              ))}
            </div>

            {suggestion?.organization?.explanation && (
              <p className="ai-explanation">{suggestion.organization.explanation}</p>
            )}

            {/* Organization Options */}
            <div className="ai-options">
              <h5>Options</h5>
              
              <label className="ai-option">
                <select
                  value={organizationMode}
                  onChange={(e) => setOrganizationMode(e.target.value)}
                >
                  <option value={ORGANIZATION_MODES.CHROME_GROUPS}>
                    Create Chrome Tab Groups
                  </option>
                  <option value={ORGANIZATION_MODES.HIERARCHY}>
                    Update Hierarchy Only
                  </option>
                  <option value={ORGANIZATION_MODES.BOTH}>
                    Both (Groups + Hierarchy)
                  </option>
                </select>
              </label>

              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={collapseGroups}
                  onChange={(e) => setCollapseGroups(e.target.checked)}
                />
                <span>Collapse groups after creation</span>
              </label>

              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                />
                <span>Clear existing groups first</span>
              </label>
            </div>

            {/* Feedback Input for Regeneration */}
            {aiAvailable?.available && showFeedbackInput && (
              <div className="ai-feedback-section">
                <label className="ai-feedback-label">
                  What would you like to change?
                </label>
                <textarea
                  className="ai-feedback-input"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g., 'Separate work and personal tabs', 'Create fewer groups', 'Group all news sites together'..."
                  rows={3}
                  autoFocus
                />
                <div className="ai-feedback-actions">
                  <button
                    className="ai-btn ai-btn-primary ai-btn-small"
                    onClick={() => handleGenerateSuggestion(feedbackText)}
                    disabled={!feedbackText.trim() || isApplying}
                  >
                    🔄 Regenerate with Feedback
                  </button>
                  <button
                    className="ai-btn ai-btn-secondary ai-btn-small"
                    onClick={() => {
                      setShowFeedbackInput(false);
                      setFeedbackText('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="ai-preview-actions">
              <button
                className="ai-btn ai-btn-primary"
                onClick={handleApply}
                disabled={isApplying}
              >
                {isApplying ? 'Creating Groups...' : '✓ Create Tab Groups'}
              </button>
              <button
                className="ai-btn ai-btn-secondary"
                onClick={handleReject}
                disabled={isApplying}
              >
                Cancel
              </button>
              {aiAvailable?.available && !showFeedbackInput && (
                <button
                  className="ai-btn ai-btn-secondary"
                  onClick={() => setShowFeedbackInput(true)}
                  disabled={isApplying}
                  title="Regenerate with feedback"
                >
                  🔄
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Preview group component with color indicator
 */
function PreviewGroup({ group, colorIndex, depth = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasContent = (group.children && group.children.length > 0) || (group.tabs && group.tabs.length > 0);
  const color = TAB_GROUP_COLORS[colorIndex % TAB_GROUP_COLORS.length];

  return (
    <div className={`ai-preview-group depth-${depth}`}>
      <div 
        className="ai-preview-group-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="ai-preview-expand">
          {hasContent ? (isExpanded ? '▼' : '►') : '•'}
        </span>
        <span 
          className="ai-preview-color-badge"
          style={{ backgroundColor: getColorHex(color) }}
        />
        <span className="ai-preview-group-name">{group.name}</span>
        <span className="ai-preview-group-count">
          {group.tabs?.length || 0} tabs
        </span>
      </div>

      {isExpanded && (
        <div className="ai-preview-group-content">
          {group.tabs?.map((tab, idx) => (
            <div key={idx} className="ai-preview-tab">
              <span className="ai-preview-tab-title" title={tab.url}>
                {tab.title || 'Untitled'}
              </span>
            </div>
          ))}

          {group.children?.map((child, idx) => (
            <PreviewGroup 
              key={idx} 
              group={child} 
              colorIndex={colorIndex}
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Convert Chrome color name to hex for preview
 */
function getColorHex(colorName) {
  const colors = {
    blue: '#4285f4',
    cyan: '#00bcd4',
    green: '#34a853',
    yellow: '#fbbc04',
    orange: '#ff5722',
    pink: '#e91e63',
    purple: '#9c27b0',
    red: '#ea4335',
    grey: '#9e9e9e'
  };
  return colors[colorName] || colors.grey;
}

export default AIOrganizePanel;
