import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { AI_PROVIDERS, getApiKey, saveApiKey, removeApiKey, hasApiKey } from '../../utils/settings';

function AISettings() {
  const { settings, updateSingleSetting, loading } = useSettings();
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [keyStatus, setKeyStatus] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  // Load API key status on mount
  useEffect(() => {
    const loadKeyStatus = async () => {
      const status = {};
      for (const providerId of Object.keys(AI_PROVIDERS)) {
        status[providerId] = await hasApiKey(providerId);
      }
      setKeyStatus(status);
    };
    loadKeyStatus();
  }, []);

  if (loading || !settings) {
    return <div className="settings-loading">Loading...</div>;
  }

  const aiSettings = settings.ai || {};
  const currentProvider = aiSettings.provider || 'openrouter';
  const currentModel = aiSettings.model || 'meta-llama/llama-3.2-3b-instruct:free';
  const aiEnabled = aiSettings.enabled || false;
  const autoOrganize = aiSettings.autoOrganize || false;
  const organizationStrategy = aiSettings.organizationStrategy || 'smart';

  const providerConfig = AI_PROVIDERS[currentProvider];

  const handleProviderChange = async (provider) => {
    await updateSingleSetting('ai.provider', provider);
    // Reset model to first available for new provider
    const newProvider = AI_PROVIDERS[provider];
    if (newProvider.models.length > 0) {
      await updateSingleSetting('ai.model', newProvider.models[0].id);
    }
  };

  const handleModelChange = async (model) => {
    await updateSingleSetting('ai.model', model);
  };

  const handleEnableChange = async (enabled) => {
    await updateSingleSetting('ai.enabled', enabled);
  };

  const handleAutoOrganizeChange = async (auto) => {
    await updateSingleSetting('ai.autoOrganize', auto);
  };

  const handleStrategyChange = async (strategy) => {
    await updateSingleSetting('ai.organizationStrategy', strategy);
  };

  const handleApiKeyChange = (provider, value) => {
    setApiKeyInputs(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const handleSaveApiKey = async (provider) => {
    const key = apiKeyInputs[provider];
    if (!key || key.trim() === '') return;

    try {
      await saveApiKey(provider, key.trim());
      setKeyStatus(prev => ({ ...prev, [provider]: true }));
      setApiKeyInputs(prev => ({ ...prev, [provider]: '' }));
      setSaveStatus({ type: 'success', message: `API key saved for ${AI_PROVIDERS[provider].name}` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to save API key' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleRemoveApiKey = async (provider) => {
    try {
      await removeApiKey(provider);
      setKeyStatus(prev => ({ ...prev, [provider]: false }));
      setSaveStatus({ type: 'success', message: `API key removed for ${AI_PROVIDERS[provider].name}` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to remove API key' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">AI Tab Organization</h2>
      <p className="settings-section-description">
        Use AI to intelligently organize and group your tabs based on content, topics, or domains.
      </p>

      {/* Enable AI */}
      <div className="settings-option">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => handleEnableChange(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Enable AI Features</span>
        </label>
        <p className="settings-option-description">
          Turn on AI-powered tab organization capabilities
        </p>
      </div>

      {aiEnabled && (
        <>
          {/* Provider Selection */}
          <div className="settings-option">
            <label className="settings-label">AI Provider</label>
            <select
              className="settings-select"
              value={currentProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
                <option key={id} value={id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <p className="settings-option-description">
              Select your preferred AI provider. OpenRouter offers free models.
            </p>
          </div>

          {/* API Key Input */}
          {providerConfig.requiresKey && (
            <div className="settings-option">
              <label className="settings-label">
                {providerConfig.name} API Key
                {keyStatus[currentProvider] && (
                  <span className="key-status-badge">✓ Configured</span>
                )}
              </label>
              <div className="api-key-input-group">
                <input
                  type={showKeys[currentProvider] ? 'text' : 'password'}
                  className="settings-input api-key-input"
                  placeholder={keyStatus[currentProvider] ? '••••••••••••••••' : 'Enter your API key'}
                  value={apiKeyInputs[currentProvider] || ''}
                  onChange={(e) => handleApiKeyChange(currentProvider, e.target.value)}
                />
                <button
                  type="button"
                  className="api-key-toggle-btn"
                  onClick={() => toggleShowKey(currentProvider)}
                  title={showKeys[currentProvider] ? 'Hide' : 'Show'}
                >
                  {showKeys[currentProvider] ? '🙈' : '👁️'}
                </button>
                <button
                  type="button"
                  className="api-key-save-btn"
                  onClick={() => handleSaveApiKey(currentProvider)}
                  disabled={!apiKeyInputs[currentProvider]}
                >
                  Save
                </button>
                {keyStatus[currentProvider] && (
                  <button
                    type="button"
                    className="api-key-remove-btn"
                    onClick={() => handleRemoveApiKey(currentProvider)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="settings-option-description">
                Your API key is stored locally and never sent anywhere except to the AI provider.
                {currentProvider === 'openrouter' && (
                  <> Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a></>
                )}
              </p>
            </div>
          )}

          {/* Custom Endpoint */}
          {currentProvider === 'custom' && (
            <div className="settings-option">
              <label className="settings-label">Custom API Endpoint</label>
              <input
                type="url"
                className="settings-input"
                placeholder="https://your-api-endpoint.com/v1"
                value={aiSettings.customEndpoint || ''}
                onChange={(e) => updateSingleSetting('ai.customEndpoint', e.target.value)}
              />
              <p className="settings-option-description">
                Enter the base URL for your custom OpenAI-compatible API endpoint
              </p>
            </div>
          )}

          {/* Model Selection */}
          {providerConfig.models.length > 0 && (
            <div className="settings-option">
              <label className="settings-label">Model</label>
              <select
                className="settings-select"
                value={currentModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {providerConfig.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.free && '(Free)'}
                  </option>
                ))}
              </select>
              <p className="settings-option-description">
                Free models are available through OpenRouter with no cost
              </p>
            </div>
          )}

          {/* Organization Strategy */}
          <div className="settings-option">
            <label className="settings-label">Organization Strategy</label>
            <select
              className="settings-select"
              value={organizationStrategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
            >
              <option value="smart">Smart (AI decides best grouping)</option>
              <option value="domain">By Domain (group by website)</option>
              <option value="topic">By Topic (group by content theme)</option>
              <option value="activity">By Activity (group by task/workflow)</option>
            </select>
            <p className="settings-option-description">
              How AI should organize your tabs
            </p>
          </div>

          {/* Auto Organize */}
          <div className="settings-option">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={autoOrganize}
                onChange={(e) => handleAutoOrganizeChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Auto-organize New Tabs</span>
            </label>
            <p className="settings-option-description">
              Automatically suggest organization when you open many tabs
            </p>
          </div>
        </>
      )}

      {/* Status Message */}
      {saveStatus && (
        <div className={`status-message status-${saveStatus.type}`}>
          {saveStatus.message}
        </div>
      )}

      {/* Info Box */}
      <div className="settings-info-box">
        <h4>About AI Tab Organization</h4>
        <p>
          AI organization uses language models to analyze your tab titles and URLs
          to suggest intelligent groupings. Your tab data is sent to the selected
          AI provider for processing.
        </p>
        <ul>
          <li><strong>Free models</strong> are available via OpenRouter</li>
          <li><strong>API keys</strong> are stored locally in your browser</li>
          <li><strong>Privacy:</strong> Only tab titles and URLs are processed</li>
        </ul>
      </div>
    </div>
  );
}

export default AISettings;




