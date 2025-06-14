const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config/config');

class Persona {
  constructor(data) {
    this.name = data.name;
    this.description = data.description;
    this.expertise = data.expertise || {};
    this.background = data.background || {};
    this.traits = data.traits || {};
    this.goals = data.goals || [];
    this.preferences = data.preferences || {};
    this.validationErrors = [];
    
    this.validate();
  }

  /**
   * Validate the persona data
   * @returns {boolean} - Whether the persona is valid
   */
  validate() {
    this.validationErrors = [];
    
    if (!this.name) {
      this.validationErrors.push('Persona must have a name');
    }
    
    if (!this.description) {
      this.validationErrors.push('Persona must have a description');
    }
    
    // Expertise validation
    if (this.expertise) {
      if (!this.expertise.technical && !this.expertise.domain && !this.expertise.tools) {
        this.validationErrors.push('Expertise should include at least one category (technical, domain, or tools)');
      }
    }
    
    return this.validationErrors.length === 0;
  }

  /**
   * Check if the persona is valid
   * @returns {boolean} - Whether the persona is valid
   */
  isValid() {
    return this.validationErrors.length === 0;
  }

  /**
   * Get validation errors
   * @returns {Array} - List of validation errors
   */
  getValidationErrors() {
    return this.validationErrors;
  }

  /**
   * Convert persona to a prompt for LLM
   * @returns {string} - Prompt for LLM
   */
  toPrompt() {
    let prompt = `# User Persona: ${this.name}\n\n`;
    prompt += `${this.description}\n\n`;
    
    // Add expertise details
    if (this.expertise) {
      prompt += '## Expertise\n';
      
      if (this.expertise.technical) {
        prompt += `- Technical expertise: ${this.expertise.technical}\n`;
      }
      
      if (this.expertise.domain) {
        prompt += `- Domain expertise: ${this.expertise.domain}\n`;
      }
      
      if (this.expertise.tools) {
        prompt += `- Tools expertise: ${this.expertise.tools}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add background
    if (this.background && Object.keys(this.background).length > 0) {
      prompt += '## Background\n';
      
      for (const [key, value] of Object.entries(this.background)) {
        prompt += `- ${key}: ${value}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add traits
    if (this.traits && Object.keys(this.traits).length > 0) {
      prompt += '## Personality Traits\n';
      
      for (const [key, value] of Object.entries(this.traits)) {
        prompt += `- ${key}: ${value}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add goals
    if (this.goals && this.goals.length > 0) {
      prompt += '## Goals\n';
      
      for (const goal of this.goals) {
        prompt += `- ${goal}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add preferences
    if (this.preferences && Object.keys(this.preferences).length > 0) {
      prompt += '## Preferences\n';
      
      for (const [key, value] of Object.entries(this.preferences)) {
        prompt += `- ${key}: ${value}\n`;
      }
      
      prompt += '\n';
    }
    
    return prompt;
  }
}

class PersonaManager {
  constructor() {
    this.personas = new Map();
    this.personasDir = '';
  }

  /**
   * Load all personas from the personas directory
   * @returns {Map} - Map of persona name to Persona object
   */
  loadAllPersonas() {
    this.personas.clear();
    this.personasDir = config.getPersonasDir();
    
    try {
      if (!fs.existsSync(this.personasDir)) {
        fs.mkdirSync(this.personasDir, { recursive: true });
        console.log(`Created personas directory at ${this.personasDir}`);
        return this.personas;
      }
      
      const files = fs.readdirSync(this.personasDir);
      const yamlFiles = files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
      
      for (const file of yamlFiles) {
        try {
          const filePath = path.join(this.personasDir, file);
          const personaData = yaml.load(fs.readFileSync(filePath, 'utf8'));
          const persona = new Persona(personaData);
          
          if (persona.isValid()) {
            this.personas.set(persona.name, persona);
          } else {
            console.warn(`Invalid persona in ${file}: ${persona.getValidationErrors().join(', ')}`);
          }
        } catch (error) {
          console.error(`Error loading persona from ${file}:`, error.message);
        }
      }
      
      return this.personas;
    } catch (error) {
      console.error('Error loading personas:', error.message);
      return new Map();
    }
  }

  /**
   * Get a persona by name
   * @param {string} name - Name of the persona
   * @returns {Persona|null} - The persona object or null if not found
   */
  getPersona(name) {
    return this.personas.get(name) || null;
  }

  /**
   * Get all persona names
   * @returns {Array} - List of persona names
   */
  getPersonaNames() {
    return Array.from(this.personas.keys());
  }

  /**
   * Create a sample persona
   * @param {string} name - Name for the sample persona
   * @returns {string} - Path to the created sample persona file
   */
  createSamplePersona(name = 'beginner_developer') {
    const samplePersona = {
      name: name,
      description: 'A junior developer who is new to programming and the technology stack.',
      expertise: {
        technical: 'Beginner',
        domain: 'Limited',
        tools: 'Basic understanding of development tools'
      },
      background: {
        education: 'Computer Science student or bootcamp graduate',
        experience: 'Less than 1 year of professional experience'
      },
      traits: {
        patience: 'Low',
        attention_to_detail: 'Moderate',
        learning_style: 'Prefers step-by-step tutorials with examples'
      },
      goals: [
        'Understand basic concepts quickly',
        'Find practical examples to learn from',
        'Avoid complex technical jargon'
      ],
      preferences: {
        documentation_style: 'Visual with clear examples',
        communication: 'Simple and direct explanations'
      }
    };
    
    const filePath = path.join(this.personasDir, `${name}.yml`);
    
    try {
      if (!fs.existsSync(this.personasDir)) {
        fs.mkdirSync(this.personasDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, yaml.dump(samplePersona));
      return filePath;
    } catch (error) {
      console.error('Error creating sample persona:', error.message);
      return null;
    }
  }
}

module.exports = {
  Persona,
  PersonaManager
};
