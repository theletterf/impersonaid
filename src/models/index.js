const OpenAILLM = require('./openai');
const ClaudeLLM = require('./anthropic');
const GeminiLLM = require('./gemini');
const OllamaLLM = require('./ollama');

/**
 * LLM Factory for creating LLM instances
 */
class LLMFactory {
  constructor(config) {
    this.config = config;
    this.models = {};
  }

  /**
   * Get an LLM instance by provider
   * @param {string} provider - The LLM provider (openai, anthropic, google, ollama)
   * @returns {BaseLLM} - The LLM instance
   */
  getLLM(provider) {
    if (this.models[provider]) {
      return this.models[provider];
    }

    switch (provider.toLowerCase()) {
      case 'openai':
        this.models[provider] = new OpenAILLM(this.config);
        break;
      case 'anthropic':
      case 'claude':
        this.models[provider] = new ClaudeLLM(this.config);
        break;
      case 'google':
      case 'gemini':
        this.models[provider] = new GeminiLLM(this.config);
        break;
      case 'ollama':
        this.models[provider] = new OllamaLLM(this.config);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    return this.models[provider];
  }

  /**
   * Get all supported providers
   * @returns {Array<string>} - List of supported providers
   */
  getSupportedProviders() {
    return ['openai', 'anthropic', 'google', 'ollama'];
  }
}

module.exports = LLMFactory;
