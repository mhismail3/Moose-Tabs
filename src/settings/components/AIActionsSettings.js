import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  getAIPrompts, 
  getCustomAIPrompts, 
  saveCustomAIPrompt, 
  deleteCustomAIPrompt,
  DEFAULT_AI_PROMPTS 
} from '../../utils/settings';

function AIActionsSettings() {
  const { settings, loading } = useSettings();
  const [customPrompts, setCustomPrompts] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load custom prompts on mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const prompts = await getCustomAIPrompts();
        setCustomPrompts(prompts);
      } catch (error) {
        console.error('Failed to load custom prompts:', error);
      }
    };
    loadPrompts();
  }, []);

  if (loading || !settings) {
    return <div className="settings-loading">Loading...</div>;
  }

  const aiEnabled = settings.ai?.enabled ?? false;

  // Start creating a new prompt
  const handleStartCreate = () => {
    setEditingPrompt({
      id: null,
      name: '',
      icon: '✨',
      description: '',
      prompt: '',
      category: 'custom'
    });
    setIsCreating(true);
  };

  // Start editing an existing prompt
  const handleStartEdit = (prompt) => {
    setEditingPrompt({ ...prompt });
    setIsCreating(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setIsCreating(false);
  };

  // Save prompt (create or update)
  const handleSavePrompt = async () => {
    if (!editingPrompt?.name?.trim() || !editingPrompt?.prompt?.trim()) {
      setSaveStatus({ type: 'error', message: 'Name and prompt are required' });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    try {
      await saveCustomAIPrompt({
        ...editingPrompt,
        name: editingPrompt.name.trim(),
        icon: editingPrompt.icon || '✨',
        description: editingPrompt.description?.trim() || '',
        prompt: editingPrompt.prompt.trim()
      });

      // Reload prompts
      const prompts = await getCustomAIPrompts();
      setCustomPrompts(prompts);
      
      setEditingPrompt(null);
      setIsCreating(false);
      setSaveStatus({ type: 'success', message: isCreating ? 'Action created!' : 'Action updated!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save action' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (promptId) => {
    if (!window.confirm('Are you sure you want to delete this custom action?')) {
      return;
    }

    try {
      await deleteCustomAIPrompt(promptId);
      
      // Reload prompts
      const prompts = await getCustomAIPrompts();
      setCustomPrompts(prompts);
      
      setSaveStatus({ type: 'success', message: 'Action deleted' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      setSaveStatus({ type: 'error', message: 'Failed to delete action' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Update editing prompt field
  const updateEditingField = (field, value) => {
    setEditingPrompt(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">AI Actions</h2>
      <p className="settings-section-description">
        Manage custom AI actions for analyzing and working with your tabs.
        These actions appear in the AI Actions panel (✨ button).
      </p>

      {!aiEnabled && (
        <div className="settings-info-box settings-info-warning">
          <h4>AI Features Disabled</h4>
          <p>
            Enable AI features in the "AI Organization" section above to use AI Actions.
          </p>
        </div>
      )}

      {aiEnabled && (
        <>
          {/* Default Actions */}
          <div className="settings-subsection">
            <h3 className="settings-subsection-title">Built-in Actions</h3>
            <p className="settings-option-description">
              These default actions are always available and cannot be modified.
            </p>
            <div className="ai-actions-list">
              {DEFAULT_AI_PROMPTS.map(prompt => (
                <div key={prompt.id} className="ai-action-item ai-action-default">
                  <span className="ai-action-icon">{prompt.icon}</span>
                  <div className="ai-action-info">
                    <span className="ai-action-name">{prompt.name}</span>
                    <span className="ai-action-description">{prompt.description}</span>
                  </div>
                  <span className="ai-action-badge">Built-in</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Actions */}
          <div className="settings-subsection">
            <h3 className="settings-subsection-title">Custom Actions</h3>
            <p className="settings-option-description">
              Create your own actions to analyze tabs in custom ways.
            </p>

            {customPrompts.length > 0 && (
              <div className="ai-actions-list">
                {customPrompts.map(prompt => (
                  <div key={prompt.id} className="ai-action-item ai-action-custom">
                    <span className="ai-action-icon">{prompt.icon}</span>
                    <div className="ai-action-info">
                      <span className="ai-action-name">{prompt.name}</span>
                      <span className="ai-action-description">
                        {prompt.description || prompt.prompt.substring(0, 60) + '...'}
                      </span>
                    </div>
                    <div className="ai-action-buttons">
                      <button 
                        className="ai-action-btn ai-action-btn-edit"
                        onClick={() => handleStartEdit(prompt)}
                        title="Edit action"
                      >
                        ✏️
                      </button>
                      <button 
                        className="ai-action-btn ai-action-btn-delete"
                        onClick={() => handleDeletePrompt(prompt.id)}
                        title="Delete action"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customPrompts.length === 0 && !editingPrompt && (
              <div className="ai-actions-empty">
                <span className="ai-actions-empty-icon">✨</span>
                <p>No custom actions yet. Create one to get started!</p>
              </div>
            )}

            {/* Create/Edit Form */}
            {editingPrompt && (
              <div className="ai-action-editor">
                <h4 className="ai-action-editor-title">
                  {isCreating ? 'Create New Action' : 'Edit Action'}
                </h4>
                
                <div className="ai-action-editor-row">
                  <div className="ai-action-editor-field ai-action-editor-field-icon">
                    <label>Icon</label>
                    <input
                      type="text"
                      value={editingPrompt.icon}
                      onChange={(e) => updateEditingField('icon', e.target.value)}
                      maxLength={2}
                      className="settings-input settings-input-small"
                    />
                  </div>
                  <div className="ai-action-editor-field ai-action-editor-field-name">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editingPrompt.name}
                      onChange={(e) => updateEditingField('name', e.target.value)}
                      placeholder="e.g., Find Resources"
                      className="settings-input"
                    />
                  </div>
                </div>

                <div className="ai-action-editor-field">
                  <label>Short Description (optional)</label>
                  <input
                    type="text"
                    value={editingPrompt.description}
                    onChange={(e) => updateEditingField('description', e.target.value)}
                    placeholder="Brief description shown on hover"
                    className="settings-input"
                  />
                </div>

                <div className="ai-action-editor-field">
                  <label>Prompt Instructions</label>
                  <textarea
                    value={editingPrompt.prompt}
                    onChange={(e) => updateEditingField('prompt', e.target.value)}
                    placeholder="Write the instructions for what the AI should analyze or do with the selected tabs..."
                    className="settings-textarea"
                    rows={4}
                  />
                </div>

                <div className="ai-action-editor-actions">
                  <button 
                    className="settings-btn settings-btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                  <button 
                    className="settings-btn settings-btn-primary"
                    onClick={handleSavePrompt}
                    disabled={!editingPrompt.name?.trim() || !editingPrompt.prompt?.trim()}
                  >
                    {isCreating ? 'Create Action' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Add New Button */}
            {!editingPrompt && (
              <button 
                className="settings-btn settings-btn-primary ai-action-add-btn"
                onClick={handleStartCreate}
              >
                + Create Custom Action
              </button>
            )}
          </div>

          {/* Status Message */}
          {saveStatus && (
            <div className={`status-message status-${saveStatus.type}`}>
              {saveStatus.message}
            </div>
          )}

          {/* Info Box */}
          <div className="settings-info-box">
            <h4>About AI Actions</h4>
            <p>
              AI Actions let you run custom analyses on your tabs. When you click
              the ✨ button in the main interface, you can select one or more
              actions and choose which tabs to analyze.
            </p>
            <ul>
              <li><strong>Select multiple actions</strong> to combine analyses</li>
              <li><strong>Custom prompts</strong> let you ask the AI anything about your tabs</li>
              <li>Results are displayed with markdown formatting</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default AIActionsSettings;




