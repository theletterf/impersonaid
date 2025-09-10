const fs = require('fs');
const path = require('path');
const toml = require('toml');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

class Config {
  constructor() {
    this.config = {};
    this.loaded = false;
  }

  /**
   * Load configuration from a TOML file
   * @param {string} configPath - Path to the config file
   * @returns {object} - The loaded configuration
   */
  loadFromFile(configPath) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      this.config = toml.parse(configFile);
      this.loaded = true;
      return this.config;
    } catch (error) {
      console.error(`Error loading config from ${configPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Get API key for a specific provider
   * @param {string} provider - The LLM provider (openai, anthropic, google, openrouter)
   * @returns {string} - The API key
   */
  getApiKey(provider) {
    // First check environment variables
    const envVarMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      openrouter: 'OPENROUTER_API_KEY'
    };
    
    if (envVarMap[provider] && process.env[envVarMap[provider]]) {
      return process.env[envVarMap[provider]];
    }
    
    // Then check config file
    if (this.loaded && this.config.api_keys && this.config.api_keys[provider]) {
      return this.config.api_keys[provider];
    }
    
    return null;
  }

  /**
   * Get default model for a specific provider
   * @param {string} provider - The LLM provider (openai, anthropic, google, ollama, openrouter)
   * @returns {string} - The default model name
   */
  getDefaultModel(provider) {
    const modelKeyMap = {
      openai: 'openai_default',
      anthropic: 'anthropic_default',
      google: 'gemini_default',
      ollama: 'ollama_default',
      openrouter: 'openrouter_default'
    };
    
    const key = modelKeyMap[provider];
    if (this.loaded && this.config.models && this.config.models[key]) {
      return this.config.models[key];
    }
    
    // Default fallbacks
    const defaults = {
      openai: 'gpt-4o',
      anthropic: 'claude-3-opus-20240229',
      google: 'gemini-1.5-pro',
      ollama: 'llama3',
      openrouter: 'openai/gpt-4o'
    };
    
    return defaults[provider];
  }

  /**
   * Get Ollama configuration
   * @returns {object} - Ollama configuration
   */
  getOllamaConfig() {
    if (this.loaded && this.config.ollama) {
      return this.config.ollama;
    }
    
    return { host: 'http://localhost:11434' };
  }

  /**
   * Get output configuration
   * @returns {object} - Output configuration
   */
  getOutputConfig() {
    if (this.loaded && this.config.output) {
      return this.config.output;
    }
    
    return {
      default_format: 'text',
      output_dir: path.join(process.cwd(), 'output')
    };
  }

  /**
   * Get personas directory
   * @returns {string} - Path to personas directory
   */
  getPersonasDir() {
    if (this.loaded && this.config.personas && this.config.personas.personas_dir) {
      return path.resolve(this.config.personas.personas_dir);
    }
    
    return path.join(process.cwd(), 'personas');
  }
}

// Create singleton instance
const config = new Config();

module.exports = config;
