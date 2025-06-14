const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseLLM = require('./base');

/**
 * Google Gemini LLM implementation
 */
class GeminiLLM extends BaseLLM {
  constructor(config) {
    super(config);
    this.name = config.getDefaultModel('google');
    this.client = null;
    this.apiKey = config.getApiKey('google');
    this.hasBrowsingCapability = true; // Gemini supports browsing
  }

  /**
   * Initialize the Google Generative AI client
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    if (!this.apiKey) {
      console.error('Google API key not found. Please set it in the config or as an environment variable.');
      return false;
    }

    try {
      this.client = new GoogleGenerativeAI(this.apiKey);
      return true;
    } catch (error) {
      console.error('Error initializing Google Generative AI client:', error.message);
      return false;
    }
  }

  /**
   * Generate a response from Gemini
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generate(prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Generative AI client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.';

    try {
      // Get the model
      const model = this.client.getGenerativeModel({ model: modelName });
      
      // Generate content
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        }
      });

      return result.response.text();
    } catch (error) {
      console.error('Error generating response from Gemini:', error.message);
      throw error;
    }
  }

  /**
   * Generate a response from Gemini with web browsing capability
   * @param {string} url - The URL to browse
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generateWithBrowsing(url, prompt, options = {}) {
    if (!this.client) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Generative AI client');
      }
    }

    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1000;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant with web browsing capabilities.';

    try {
      // Get the model with web browsing capability
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        tools: [{
          functionDeclarations: [{
            name: "browse_web",
            description: "Browse web pages and extract information",
            parameters: {
              type: "OBJECT",
              properties: {
                url: {
                  type: "STRING",
                  description: "The URL to browse"
                }
              },
              required: ["url"]
            }
          }]
        }]
      });
      
      // Create a message that instructs the model to browse the URL
      const browsingPrompt = `Please visit and analyze the content at ${url}. ${prompt}`;
      
      // Generate content with web browsing
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${browsingPrompt}` }] }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
        toolConfig: {
          functionCallingConfig: {
            mode: "AUTO"
          }
        }
      });

      return result.response.text();
    } catch (error) {
      console.error('Error generating response with browsing from Gemini:', error.message);
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

module.exports = GeminiLLM;
