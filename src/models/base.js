/**
 * Base LLM Model class
 * All specific LLM implementations should extend this class
 */
class BaseLLM {
  constructor(config) {
    this.config = config;
    this.name = 'base';
    this.hasBrowsingCapability = false;
  }

  /**
   * Initialize the model
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    throw new Error('Method not implemented');
  }

  /**
   * Generate a response from the model
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generate(prompt, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Generate a response from the model with web browsing capability
   * @param {string} url - The URL to browse
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the model
   * @returns {Promise<string>} - The generated response
   */
  async generateWithBrowsing(url, prompt, options = {}) {
    throw new Error('Web browsing not supported by this model');
  }

  /**
   * Check if the model is ready to use
   * @returns {boolean} - Whether the model is ready
   */
  isReady() {
    throw new Error('Method not implemented');
  }

  /**
   * Get the model name
   * @returns {string} - The model name
   */
  getModelName() {
    return this.name;
  }

  /**
   * Check if the model has web browsing capability
   * @returns {boolean} - Whether the model has web browsing capability
   */
  supportsBrowsing() {
    return this.hasBrowsingCapability;
  }
}

module.exports = BaseLLM;
