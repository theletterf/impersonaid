const { OpenAI } = require('openai');
const BaseLLM = require('./base');

/**
 * OpenAI LLM implementation
 */
class OpenAILLM extends BaseLLM {
  constructor(config) {
    super(config);
    this.name = config.getDefaultModel('openai');
    this.client = null;
    this.apiKey = config.getApiKey('openai');
    this.hasBrowsingCapability = false; // OpenAI doesn't reliably support browsing
  }

  /**
   * Initialize the OpenAI client
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    if (!this.apiKey) {
      console.error('OpenAI API key not found. Please set it in the config or as an environment variable.');
      return false;
    }

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
      return true;
    } catch (error) {
      console.error('Error initializing OpenAI client:', error.message);
      return false;
    }
  }

  /**
   * Generate a response from OpenAI
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generate(prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize OpenAI client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response from OpenAI:', error.message);
      throw error;
    }
  }

  /**
   * Generate a response from OpenAI with document content
   * @param {string} url - The URL that was browsed (for reference only)
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generateWithBrowsing(url, prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize OpenAI client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;

    try {
      // For OpenAI, we use the document content directly since it doesn't support browsing
      // The document content should be in options.documentContent
      if (!options.documentContent) {
        throw new Error('Document content is required for OpenAI when using generateWithBrowsing');
      }
      
      // Compress the content if needed by removing extra whitespace
      const compressedContent = options.documentContent
        .replace(/\s+/g, ' ')
        .trim();
      
      // Create a prompt that includes the document content
      const contentPrompt = `The following is the content from ${url}:\n\n${compressedContent}\n\nBased on this content, ${prompt}`;
      
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: contentPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response with document content from OpenAI:', error.message);
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

module.exports = OpenAILLM;
