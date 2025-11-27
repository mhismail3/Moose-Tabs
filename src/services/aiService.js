/**
 * AI Service Layer
 * Provides abstracted access to various AI providers for tab organization
 */

import { getSettings, getApiKey, AI_PROVIDERS } from '../utils/settings';

/**
 * Base error class for AI service errors
 */
export class AIServiceError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * AI Service class - handles all AI provider interactions
 */
class AIService {
  constructor() {
    this.settings = null;
    this.apiKey = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with current settings
   */
  async initialize() {
    try {
      this.settings = await getSettings();
      const provider = this.settings.ai?.provider || 'openrouter';
      this.apiKey = await getApiKey(provider);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      throw new AIServiceError('Failed to initialize AI service', 'INIT_FAILED', { error });
    }
  }

  /**
   * Ensure the service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if AI features are available
   */
  async isAvailable() {
    await this.ensureInitialized();
    
    if (!this.settings.ai?.enabled) {
      return { available: false, reason: 'AI features are disabled' };
    }

    const provider = this.settings.ai.provider;
    const providerConfig = AI_PROVIDERS[provider];

    if (providerConfig?.requiresKey && !this.apiKey) {
      return { available: false, reason: 'API key not configured' };
    }

    return { available: true };
  }

  /**
   * Get the endpoint URL for the current provider
   */
  getEndpoint() {
    const provider = this.settings.ai?.provider || 'openrouter';
    
    if (provider === 'custom') {
      return this.settings.ai?.customEndpoint || '';
    }
    
    return AI_PROVIDERS[provider]?.baseUrl || '';
  }

  /**
   * Get headers for API requests
   */
  getHeaders(provider) {
    const headers = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'openrouter':
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        headers['HTTP-Referer'] = chrome.runtime.getURL('/');
        headers['X-Title'] = 'Moose Tabs';
        break;
      
      case 'openai':
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      
      case 'anthropic':
        headers['x-api-key'] = this.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      
      case 'gemini':
        // Gemini uses query param for key
        break;
      
      case 'groq':
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      
      case 'custom':
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Format request body for the provider
   */
  formatRequest(provider, messages, options = {}) {
    const model = this.settings.ai?.model || 'meta-llama/llama-3.2-3b-instruct:free';
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;

    switch (provider) {
      case 'anthropic':
        return {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: messages.filter(m => m.role !== 'system'),
          system: messages.find(m => m.role === 'system')?.content || ''
        };
      
      case 'gemini':
        return {
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature
          }
        };
      
      default:
        // OpenAI-compatible format (OpenRouter, OpenAI, Groq, custom)
        return {
          model,
          messages,
          max_tokens: maxTokens,
          temperature
        };
    }
  }

  /**
   * Parse response from the provider
   */
  parseResponse(provider, response) {
    switch (provider) {
      case 'anthropic':
        return response.content?.[0]?.text || '';
      
      case 'gemini':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      default:
        // OpenAI-compatible format
        return response.choices?.[0]?.message?.content || '';
    }
  }

  /**
   * Make an API call to the AI provider with timeout and automatic fallback
   */
  async callAPI(messages, options = {}) {
    await this.ensureInitialized();

    const availability = await this.isAvailable();
    if (!availability.available) {
      throw new AIServiceError(availability.reason, 'NOT_AVAILABLE');
    }

    const provider = this.settings.ai.provider;
    
    // For OpenRouter, try fallback models if the selected one is unavailable
    if (provider === 'openrouter') {
      return this.callOpenRouterWithFallback(messages, options);
    }

    return this.makeAPIRequest(messages, options, this.settings.ai.model);
  }

  /**
   * Try OpenRouter with free model fallback
   */
  async callOpenRouterWithFallback(messages, options = {}) {
    const currentModel = this.settings.ai.model;
    
    // If using auto-free, try each free model in order
    if (currentModel === 'auto-free') {
      const freeModels = AI_PROVIDERS.openrouter.freeModels || [];
      
      for (let i = 0; i < freeModels.length; i++) {
        const model = freeModels[i];
        try {
          console.log(`Trying free model ${i + 1}/${freeModels.length}: ${model}`);
          return await this.makeAPIRequest(messages, options, model);
        } catch (error) {
          const isRetryable = error.message?.includes('No endpoints') || 
                              error.message?.includes('unavailable') ||
                              error.code === 'MODEL_UNAVAILABLE' ||
                              error.code === 'RATE_LIMITED';
          
          if (isRetryable && i < freeModels.length - 1) {
            console.log(`Model ${model} failed, trying next...`);
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          // Last model or non-retryable error
          if (i === freeModels.length - 1) {
            throw new AIServiceError(
              'All free models are currently busy. Please try again in a moment.',
              'ALL_MODELS_BUSY'
            );
          }
          throw error;
        }
      }
    }
    
    // For specific models, just try that one
    try {
      console.log(`Using model: ${currentModel}`);
      return await this.makeAPIRequest(messages, options, currentModel);
    } catch (error) {
      if (error.message?.includes('Insufficient credits')) {
        throw new AIServiceError(
          'This model requires credits. Switch to "Auto (Free Models Only)" in Settings.',
          'INSUFFICIENT_CREDITS'
        );
      }
      throw error;
    }
  }

  /**
   * Make the actual API request
   */
  async makeAPIRequest(messages, options = {}, modelOverride = null) {
    const provider = this.settings.ai.provider;
    const timeout = options.timeout || 30000; // 30 second timeout
    let endpoint = this.getEndpoint();
    const headers = this.getHeaders(provider);
    const body = this.formatRequest(provider, messages, options);
    
    // Override model if specified
    if (modelOverride) {
      body.model = modelOverride;
    }

    // Build the full URL
    switch (provider) {
      case 'anthropic':
        endpoint += '/messages';
        break;
      
      case 'gemini':
        const model = modelOverride || this.settings.ai.model || 'gemini-1.5-flash';
        endpoint += `/models/${model}:generateContent?key=${this.apiKey}`;
        break;
      
      case 'openrouter':
      case 'openai':
      case 'groq':
      case 'custom':
      default:
        endpoint += '/chat/completions';
        break;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`Calling ${provider} API with model: ${body.model}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = this.parseErrorMessage(response.status, errorData, provider);
        
        // Check if it's a model availability issue
        if (errorMessage.includes('No endpoints') || errorMessage.includes('unavailable')) {
          throw new AIServiceError(errorMessage, 'MODEL_UNAVAILABLE', { status: response.status, errorData });
        }
        
        // Check if it's rate limiting
        if (response.status === 429 || errorMessage.includes('Rate limited')) {
          throw new AIServiceError(errorMessage, 'RATE_LIMITED', { status: response.status, errorData });
        }
        
        throw new AIServiceError(errorMessage, 'API_ERROR', { status: response.status, errorData });
      }

      const data = await response.json();
      const result = this.parseResponse(provider, data);
      
      // Ensure result is a string before calling trim
      if (!result || typeof result !== 'string' || result.trim() === '') {
        throw new AIServiceError('AI returned empty response. Try again or use a different model.', 'EMPTY_RESPONSE');
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new AIServiceError(
          'Request timed out. The AI service is slow - try a smaller/faster model.',
          'TIMEOUT'
        );
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new AIServiceError(
          'Network error. Check your internet connection and try again.',
          'NETWORK_ERROR'
        );
      }
      
      throw new AIServiceError(
        error.message || 'Failed to call AI API',
        'REQUEST_FAILED',
        { error }
      );
    }
  }

  /**
   * Parse error message from provider response
   */
  parseErrorMessage(status, errorData, provider) {
    // Extract meaningful error message
    const rawMessage = errorData.error?.message || 
                       errorData.message || 
                       errorData.error?.type ||
                       '';
    
    // Common error codes
    if (status === 401) {
      return 'Invalid API key. Please check your API key in Settings.';
    }
    if (status === 403) {
      return 'Access denied. Your API key may not have permission for this model.';
    }
    if (status === 429) {
      // Mark as rate limited for retry logic
      return 'Rate limited - trying another model...';
    }
    if (status === 500 || status === 502 || status === 503) {
      return 'AI service is temporarily unavailable. Please try again in a moment.';
    }
    if (status === 400 && rawMessage.includes('context')) {
      return 'Too many tabs to process at once. Try with fewer tabs.';
    }
    
    // Provider-specific messages
    if (provider === 'openrouter') {
      if (rawMessage.includes('No endpoints available')) {
        return 'This model is currently unavailable. Try a different model.';
      }
      if (rawMessage.includes('credit')) {
        return 'Insufficient credits. Use a free model or add credits to your account.';
      }
    }
    
    return rawMessage || `Request failed (${status}). Please try again.`;
  }

  /**
   * Analyze tabs and suggest organization
   * @param {Array} tabs - Array of tab objects
   * @param {string} strategy - Organization strategy
   * @param {Object} options - Additional options
   * @param {string} options.feedback - User feedback for regeneration
   */
  async analyzeTabsForOrganization(tabs, strategy = 'smart', options = {}) {
    // First check availability and provide clear error
    const availability = await this.isAvailable();
    if (!availability.available) {
      return {
        success: false,
        error: availability.reason
      };
    }

    const { feedback } = options;
    
    const tabData = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      domain: extractDomain(tab.url)
    }));

    const systemPrompt = this.getOrganizationSystemPrompt(strategy);
    let userPrompt = this.getOrganizationUserPrompt(tabData, strategy);
    
    // Add user feedback if provided (ensure it's a string)
    if (feedback && typeof feedback === 'string' && feedback.trim()) {
      userPrompt += `\n\nIMPORTANT USER FEEDBACK - adjust your organization based on this:
"${feedback.trim()}"

Please incorporate this feedback while still following all the JSON format requirements.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      console.log('Calling AI with', tabData.length, 'tabs using strategy:', strategy);
      
      const response = await this.callAPI(messages, {
        maxTokens: 2048,
        temperature: feedback ? 0.5 : 0.3
      });

      console.log('AI response received, parsing...');
      const result = this.parseOrganizationResponse(response, tabData);
      
      if (!result.success) {
        console.error('Failed to parse AI response:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('AI call failed:', error);
      throw error; // Re-throw to let caller handle with proper message
    }
  }

  /**
   * Get system prompt for organization
   */
  getOrganizationSystemPrompt(strategy) {
    const basePrompt = `You are an expert at organizing browser tabs into logical hierarchical groups.
Your task is to analyze tab titles and URLs and suggest a hierarchical organization.

IMPORTANT RULES:
1. Output ONLY valid JSON, no explanations or markdown
2. Every tab ID from the input MUST appear exactly once in the output
3. Create a meaningful hierarchy with parent-child relationships
4. Group related tabs together
5. Maximum nesting depth is 3 levels
6. Use tab IDs (numbers) exactly as provided`;

    const strategyPrompts = {
      smart: `
Strategy: Smart grouping based on content, topics, and relationships.
- Group tabs by topic/theme when clear relationships exist
- Keep related research together
- Group tabs from same project/task together`,

      domain: `
Strategy: Group by domain/website.
- Primary grouping by domain (e.g., all GitHub tabs together)
- Secondary grouping by subdomain or path if many from same domain`,

      topic: `
Strategy: Group by content topic/theme.
- Ignore domains, focus on what the pages are about
- Group by topic: work, research, entertainment, social, etc.
- Create intuitive thematic groups`,

      activity: `
Strategy: Group by likely user activity/task.
- Group tabs that seem part of the same workflow
- Consider: research tasks, shopping, reading, work projects
- Group by what the user was likely trying to accomplish`
    };

    return basePrompt + (strategyPrompts[strategy] || strategyPrompts.smart);
  }

  /**
   * Get user prompt for organization
   */
  getOrganizationUserPrompt(tabData, strategy) {
    const tabList = tabData.map(t => 
      `- ID: ${t.id}, Title: "${t.title}", Domain: ${t.domain}`
    ).join('\n');

    return `Organize these ${tabData.length} tabs into a hierarchy:

${tabList}

Return a JSON object with this exact structure:
{
  "groups": [
    {
      "name": "Group Name",
      "tabs": [tab_id1, tab_id2],
      "children": [
        {
          "name": "Subgroup Name",
          "tabs": [tab_id3]
        }
      ]
    }
  ],
  "explanation": "Brief explanation of the organization"
}

REQUIREMENTS:
- Every tab ID MUST appear exactly once
- "tabs" contains tab IDs (numbers)
- "children" is optional for nested groups
- Output ONLY the JSON, nothing else`;
  }

  /**
   * Parse the organization response from AI
   */
  parseOrganizationResponse(response, originalTabs) {
    try {
      // Ensure response is a string
      if (!response || typeof response !== 'string') {
        return {
          success: false,
          error: 'Invalid AI response format'
        };
      }
      
      // Try to extract JSON from the response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate that all tabs are accounted for
      const allTabIds = new Set(originalTabs.map(t => t.id));
      const organizedIds = new Set();
      
      const collectIds = (groups) => {
        for (const group of groups) {
          if (group.tabs) {
            group.tabs.forEach(id => organizedIds.add(id));
          }
          if (group.children) {
            collectIds(group.children);
          }
        }
      };
      
      collectIds(parsed.groups || []);
      
      // Check for missing tabs
      const missingIds = [...allTabIds].filter(id => !organizedIds.has(id));
      if (missingIds.length > 0) {
        // Add missing tabs to an "Other" group
        parsed.groups = parsed.groups || [];
        parsed.groups.push({
          name: 'Other',
          tabs: missingIds
        });
      }
      
      return {
        success: true,
        organization: parsed,
        tabCount: originalTabs.length
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error, response);
      return {
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: response
      };
    }
  }

  /**
   * Explain why tabs were grouped in a certain way
   */
  async explainOrganization(organization) {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant explaining browser tab organization. Be concise and clear.'
      },
      {
        role: 'user',
        content: `Explain this tab organization in 2-3 sentences:\n${JSON.stringify(organization, null, 2)}`
      }
    ];

    return await this.callAPI(messages, { maxTokens: 256, temperature: 0.5 });
  }

  /**
   * Test the AI connection
   */
  async testConnection() {
    try {
      await this.ensureInitialized();
      
      const availability = await this.isAvailable();
      if (!availability.available) {
        return { success: false, error: availability.reason };
      }

      const response = await this.callAPI([
        { role: 'user', content: 'Respond with just "OK" to confirm the connection works.' }
      ], { maxTokens: 10 });

      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// Singleton instance
let aiServiceInstance = null;
let initPromise = null;

/**
 * Get the AI service singleton
 */
export function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

/**
 * Get AI service and ensure it's initialized (prevents race conditions)
 */
export async function getInitializedAIService() {
  const service = getAIService();
  if (!service.initialized) {
    if (!initPromise) {
      initPromise = service.initialize().catch(err => {
        initPromise = null;
        throw err;
      }).then(() => {
        initPromise = null;
      });
    }
    await initPromise;
  }
  return service;
}

/**
 * Reset the AI service (useful after settings change)
 */
export function resetAIService() {
  if (aiServiceInstance) {
    aiServiceInstance.initialized = false;
    aiServiceInstance.settings = null;
    aiServiceInstance.apiKey = null;
  }
  initPromise = null;
}

export default AIService;


