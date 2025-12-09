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
        // Extended thinking requires beta header
        headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
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
      
      case 'gemini': {
        // Separate system instruction from other messages
        const systemMessage = messages.find(m => m.role === 'system');
        const otherMessages = messages.filter(m => m.role !== 'system');
        
        const request = {
          contents: otherMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature
          }
        };
        
        // Add system instruction if present
        if (systemMessage) {
          request.system_instruction = {
            parts: [{ text: systemMessage.content }]
          };
        }
        
        return request;
      }
      
      case 'openai': {
        // Newer OpenAI models (gpt-5, gpt-4.1, o-series) use max_completion_tokens
        const useNewTokenParam = this.isNewerOpenAIModel(model);
        const request = {
          model,
          messages,
          temperature
        };
        if (useNewTokenParam) {
          request.max_completion_tokens = maxTokens;
        } else {
          request.max_tokens = maxTokens;
        }
        return request;
      }
      
      case 'groq':
        // Groq uses max_completion_tokens (max_tokens is deprecated)
        return {
          model,
          messages,
          max_completion_tokens: maxTokens,
          temperature
        };
      
      default:
        // OpenAI-compatible format (OpenRouter, custom)
        return {
          model,
          messages,
          max_tokens: maxTokens,
          temperature
        };
    }
  }

  /**
   * Check if an OpenAI model requires the newer max_completion_tokens parameter
   */
  isNewerOpenAIModel(model) {
    if (!model) return false;
    const newerModelPrefixes = [
      'gpt-5', 'gpt-4.1', 'gpt-4.5',
      'o1', 'o3', 'o4',
      'chatgpt-4o'
    ];
    return newerModelPrefixes.some(prefix => model.startsWith(prefix));
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
    const maxRetries = 2;
    
    const tabData = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      domain: extractDomain(tab.url)
    }));
    
    const validIds = tabData.map(t => t.id);

    // Try up to maxRetries times with error-specific feedback
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const systemPrompt = this.getOrganizationSystemPrompt(strategy, tabData.length, validIds);
      let userPrompt = this.getOrganizationUserPrompt(tabData, strategy);
      
      // Add user feedback if provided (ensure it's a string)
      if (feedback && typeof feedback === 'string' && feedback.trim()) {
        userPrompt += `\n\nUSER REQUEST: "${feedback.trim()}"`;
      }
      
      // Add retry context with specific errors from previous attempt
      if (attempt > 0 && options._lastValidationErrors) {
        const errorFeedback = options._lastValidationErrors.join('; ');
        userPrompt += `\n\nPREVIOUS ATTEMPT FAILED - FIX THESE ERRORS:
${errorFeedback}

Remember: Use ONLY these IDs exactly once each: [${validIds.join(', ')}]`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      try {
        console.log(`Calling AI (attempt ${attempt + 1}/${maxRetries + 1}) with ${tabData.length} tabs using strategy: ${strategy}`);
        
        // Use very low temperature for structured output consistency
        const response = await this.callAPI(messages, {
          maxTokens: 2048,
          temperature: 0.1
        });

        console.log('AI response received, parsing and validating...');
        const result = this.parseOrganizationResponse(response, tabData);
        
        if (result.success) {
          if (attempt > 0) {
            console.log(`Success on retry attempt ${attempt + 1}`);
          }
          return result;
        }
        
        // If validation failed and we have retries left, try again with error feedback
        if (attempt < maxRetries && result.validationErrors) {
          console.warn(`Validation failed (attempt ${attempt + 1}), retrying...`, result.validationErrors);
          options._lastValidationErrors = result.validationErrors;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }
        
        // Out of retries, return the error
        console.error('Failed to parse AI response after retries:', result.error);
        return result;
        
      } catch (error) {
        console.error('AI call failed:', error);
        // Don't retry on API errors, just throw
        throw error;
      }
    }
    
    // Should not reach here, but just in case
    return {
      success: false,
      error: 'Failed to organize tabs after multiple attempts'
    };
  }

  /**
   * Get system prompt for organization
   */
  getOrganizationSystemPrompt(strategy, tabCount, validIds) {
    const idList = validIds.join(', ');
    
    const strategyInstructions = {
      smart: `Group tabs intelligently by topic, project, or theme. Related tabs should be in the same group.`,
      domain: `Group tabs by their website domain. All tabs from the same website go together.`,
      topic: `Group tabs by content topic (work, shopping, research, entertainment, etc.), ignoring which website they're from.`,
      activity: `Group tabs by user activity or task (e.g., "Planning Trip", "Work Project", "Shopping").`
    };

    return `You are a tab organization assistant. You will assign each browser tab to exactly one group.

CRITICAL RULES - FOLLOW EXACTLY:
1. You will receive exactly ${tabCount} tabs
2. The ONLY valid tab IDs are: [${idList}]
3. Each tab ID MUST appear EXACTLY ONCE in your output
4. Do NOT invent, duplicate, or skip any tab ID
5. Output ONLY valid JSON, no markdown, no explanations

${strategyInstructions[strategy] || strategyInstructions.smart}

Create 2-6 groups with short, descriptive names (1-3 words).`;
  }

  /**
   * Get user prompt for organization
   */
  getOrganizationUserPrompt(tabData, strategy) {
    // Number tabs for clarity and list valid IDs prominently
    const tabList = tabData.map((t, idx) => 
      `${idx + 1}. [ID: ${t.id}] "${t.title}" (${t.domain})`
    ).join('\n');
    
    const validIds = tabData.map(t => t.id);

    return `TABS TO ORGANIZE (${tabData.length} total):
Valid IDs: [${validIds.join(', ')}]

${tabList}

Assign each tab to a group. Output this exact JSON format:
{
  "assignments": [
    {"id": <tab_id>, "group": "<group_name>"},
    {"id": <tab_id>, "group": "<group_name>"}
  ]
}

CHECKLIST before responding:
- Does my output have exactly ${tabData.length} assignments? (REQUIRED)
- Is each ID from [${validIds.join(', ')}] used exactly once? (REQUIRED)
- Are group names short (1-3 words)? (REQUIRED)

Output ONLY the JSON:`;
  }

  /**
   * Parse and strictly validate the organization response from AI
   * Returns validation errors if the response is invalid
   */
  parseOrganizationResponse(response, originalTabs) {
    try {
      // Ensure response is a string
      if (!response || typeof response !== 'string') {
        return {
          success: false,
          error: 'Invalid AI response format',
          validationErrors: ['Response is not a string']
        };
      }
      
      // Try to extract JSON from the response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse JSON from AI response',
          validationErrors: [`JSON parse error: ${parseError.message}`],
          rawResponse: response
        };
      }
      
      // Validate the new flat assignment format
      const validationResult = this.validateAssignments(parsed, originalTabs);
      
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'AI response failed validation',
          validationErrors: validationResult.errors,
          rawResponse: response
        };
      }
      
      // Convert flat assignments to groups structure
      const organization = this.convertAssignmentsToGroups(parsed.assignments);
      
      return {
        success: true,
        organization,
        tabCount: originalTabs.length
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error, response);
      return {
        success: false,
        error: 'Failed to parse AI response',
        validationErrors: [error.message],
        rawResponse: response
      };
    }
  }

  /**
   * Strictly validate the assignments from AI response
   * Checks for: missing IDs, duplicate IDs, hallucinated IDs, count mismatch
   */
  validateAssignments(parsed, originalTabs) {
    const errors = [];
    const validIds = new Set(originalTabs.map(t => t.id));
    
    // Check if assignments array exists
    if (!parsed.assignments || !Array.isArray(parsed.assignments)) {
      errors.push('Response missing "assignments" array');
      return { valid: false, errors };
    }
    
    const assignments = parsed.assignments;
    const seenIds = new Set();
    const duplicateIds = [];
    const hallucinatedIds = [];
    
    // Check each assignment
    for (const assignment of assignments) {
      if (!assignment || typeof assignment.id === 'undefined') {
        errors.push('Assignment missing "id" field');
        continue;
      }
      
      const id = assignment.id;
      
      // Check for duplicates
      if (seenIds.has(id)) {
        duplicateIds.push(id);
      } else {
        seenIds.add(id);
      }
      
      // Check for hallucinated IDs (not in original tabs)
      if (!validIds.has(id)) {
        hallucinatedIds.push(id);
      }
      
      // Check for missing group name
      if (!assignment.group || typeof assignment.group !== 'string') {
        errors.push(`Assignment for ID ${id} missing valid "group" name`);
      }
    }
    
    // Report duplicates
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate tab IDs: [${duplicateIds.join(', ')}]`);
    }
    
    // Report hallucinated IDs
    if (hallucinatedIds.length > 0) {
      errors.push(`Invalid/hallucinated tab IDs: [${hallucinatedIds.join(', ')}]`);
    }
    
    // Check for missing IDs
    const missingIds = [...validIds].filter(id => !seenIds.has(id));
    if (missingIds.length > 0) {
      errors.push(`Missing tab IDs: [${missingIds.join(', ')}]`);
    }
    
    // Check count
    if (assignments.length !== originalTabs.length) {
      errors.push(`Expected ${originalTabs.length} assignments, got ${assignments.length}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      duplicateIds,
      hallucinatedIds,
      missingIds
    };
  }

  /**
   * Convert flat assignments array to groups structure for Chrome Tab Groups
   */
  convertAssignmentsToGroups(assignments) {
    const groupMap = new Map();
    
    // Group assignments by group name
    for (const assignment of assignments) {
      const groupName = assignment.group.trim();
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName).push(assignment.id);
    }
    
    // Convert to groups array (flat, no children - Chrome doesn't support nested groups)
    const groups = [];
    for (const [name, tabs] of groupMap) {
      groups.push({ name, tabs });
    }
    
    return {
      groups,
      explanation: `Organized ${assignments.length} tabs into ${groups.length} groups`
    };
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


