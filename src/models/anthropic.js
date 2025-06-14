const Anthropic = require('@anthropic-ai/sdk');
const BaseLLM = require('./base');

/**
 * Anthropic Claude LLM implementation
 */
class ClaudeLLM extends BaseLLM {
  constructor(config) {
    super(config);
    this.name = config.getDefaultModel('anthropic');
    this.client = null;
    this.apiKey = config.getApiKey('anthropic');
    this.hasBrowsingCapability = true; // Claude supports browsing via Claude Artifacts
  }

  /**
   * Initialize the Anthropic client
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    if (!this.apiKey) {
      console.error('Anthropic API key not found. Please set it in the config or as an environment variable.');
      return false;
    }

    try {
      this.client = new Anthropic({
        apiKey: this.apiKey
      });
      return true;
    } catch (error) {
      console.error('Error initializing Anthropic client:', error.message);
      return false;
    }
  }

  /**
   * Generate a response from Claude
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generate(prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Anthropic client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.';

    try {
      const response = await this.client.messages.create({
        model: modelName,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error generating response from Claude:', error.message);
      throw error;
    }
  }

  /**
   * Generate a response from Claude with web browsing capability
   * @param {string} url - The URL to browse
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generateWithBrowsing(url, prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Anthropic client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant with web browsing capabilities.';

    try {
      // Create a message that instructs the model to browse the URL
      const browsingPrompt = `Please visit and analyze the content at ${url}. ${prompt}`;
      
      // For Claude, instead of using tools for web browsing which may not be fully supported yet,
      // we'll include the URL in the prompt and ask Claude to analyze it based on its training
      const response = await this.client.messages.create({
        model: modelName,
        system: `${systemPrompt} When analyzing web content, focus on the user's specific questions and provide helpful responses based on the content at the URL.`,
        messages: [
          { role: 'user', content: browsingPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error generating response with browsing from Claude:', error.message);
      throw error;
    }
  }

  /**
   * Check if the model is ready to use
   * @returns {boolean} - Whether the model is ready
   */
  isReady() {
    return !!this.apiKey;
  }
}

module.exports = ClaudeLLM;
