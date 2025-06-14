const axios = require('axios');
const BaseLLM = require('./base');

/**
 * Ollama LLM implementation for local models
 */
class OllamaLLM extends BaseLLM {
  constructor(config) {
    super(config);
    this.name = config.getDefaultModel('ollama');
    this.ollamaConfig = config.getOllamaConfig();
    this.baseUrl = this.ollamaConfig.host;
  }

  /**
   * Initialize the Ollama client
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    try {
      // Test connection to Ollama server
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      if (response.status === 200) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting to Ollama server:', error.message);
      return false;
    }
  }

  /**
   * Generate a response from Ollama
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generate(prompt, options = {}) {
    const modelName = options.model || this.name;
    const temperature = options.temperature || 0.7;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.';

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: modelName,
        prompt: `${systemPrompt}\n\n${prompt}`,
        system: systemPrompt,
        options: {
          temperature: temperature,
        },
        stream: false
      });

      if (response.status === 200 && response.data) {
        return response.data.response;
      } else {
        throw new Error(`Unexpected response from Ollama: ${response.status}`);
      }
    } catch (error) {
      console.error('Error generating response from Ollama:', error.message);
      throw error;
    }
  }

  /**
   * Check if the model is ready to use
   * @returns {Promise<boolean>} - Whether the model is ready
   */
  async isReady() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      return models.some(model => model.name === this.name);
    } catch (error) {
      console.error('Error checking Ollama readiness:', error.message);
      return false;
    }
  }

  /**
   * List available models from Ollama
   * @returns {Promise<Array>} - List of available models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error.message);
      return [];
    }
  }
}

module.exports = OllamaLLM;
