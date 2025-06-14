const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');
const { PersonaManager } = require('./personas/persona');
const DocumentFetcher = require('./utils/document-fetcher');
const PromptBuilder = require('./utils/prompt-builder');
const OutputHandler = require('./output/output-handler');
const LLMFactory = require('./models');

/**
 * Main CLI class for the user persona simulator
 */
class CLI {
  constructor() {
    this.program = new Command();
    this.configPath = path.join(process.cwd(), 'config.toml');
    this.personaManager = new PersonaManager();
    this.documentFetcher = new DocumentFetcher();
    this.promptBuilder = new PromptBuilder();
    this.llmFactory = null;
    this.outputHandler = null;
  }

  /**
   * Initialize the CLI
   */
  initialize() {
    // Load configuration
    try {
      if (fs.existsSync(this.configPath)) {
        config.loadFromFile(this.configPath);
      } else {
        console.warn(`Config file not found at ${this.configPath}. Using default settings.`);
      }
    } catch (error) {
      console.error('Error loading configuration:', error.message);
    }

    this.llmFactory = new LLMFactory(config);
    this.outputHandler = new OutputHandler(config);

    // Load personas
    this.personaManager.loadAllPersonas();

    // Set up CLI commands
    this.setupCommands();
  }

  /**
   * Set up CLI commands
   */
  setupCommands() {
    this.program
      .name('llm-docs-persona-simulator')
      .description('Simulate user personas interacting with documentation using LLMs')
      .version('1.0.0');

    // List personas command
    this.program
      .command('list-personas')
      .description('List available user personas')
      .action(() => this.listPersonas());

    // Create sample persona command
    this.program
      .command('create-sample')
      .description('Create a sample persona')
      .option('-n, --name <name>', 'Name for the sample persona', 'beginner_developer')
      .action((options) => this.createSamplePersona(options.name));

    // Simulate command
    this.program
      .command('simulate')
      .description('Run a simulation with a user persona on documentation')
      .requiredOption('-p, --persona <name>', 'Name of the persona to use')
      .requiredOption('-d, --doc <url>', 'URL of the documentation to test')
      .requiredOption('-r, --request <request>', 'Request or question for the persona')
      .option('-m, --model <provider>', 'LLM provider to use (openai, anthropic, google, ollama)', 'openai')
      .option('-i, --interactive', 'Run in interactive mode', false)
      .option('-o, --output <path>', 'Path to save the output')
      .action((options) => this.runSimulation(options));

    // List models command
    this.program
      .command('list-models')
      .description('List available LLM models')
      .action(() => this.listModels());
  }

  /**
   * List available personas
   */
  listPersonas() {
    const personaNames = this.personaManager.getPersonaNames();
    
    if (personaNames.length === 0) {
      console.log('No personas found. Create one with the create-sample command.');
      return;
    }
    
    console.log('Available personas:');
    personaNames.forEach(name => console.log(`- ${name}`));
  }

  /**
   * Create a sample persona
   * @param {string} name - Name for the sample persona
   */
  createSamplePersona(name) {
    const filePath = this.personaManager.createSamplePersona(name);
    
    if (filePath) {
      console.log(`Created sample persona at ${filePath}`);
      console.log('You can modify this file to customize the persona.');
    } else {
      console.error('Failed to create sample persona.');
    }
  }

  /**
   * List available LLM models
   */
  async listModels() {
    console.log('Supported LLM providers:');
    const providers = this.llmFactory.getSupportedProviders();
    
    for (const provider of providers) {
      console.log(`\n${provider.toUpperCase()}:`);
      
      try {
        const llm = this.llmFactory.getLLM(provider);
        const defaultModel = config.getDefaultModel(provider);
        console.log(`- Default model: ${defaultModel}`);
        
        if (provider === 'ollama') {
          console.log('Checking available Ollama models...');
          const isReady = await llm.initialize();
          
          if (isReady) {
            const models = await llm.listModels();
            if (models.length > 0) {
              console.log('Available models:');
              models.forEach(model => console.log(`- ${model.name}`));
            } else {
              console.log('No Ollama models found.');
            }
          } else {
            console.log('Ollama server not available. Make sure it is running.');
          }
        }
      } catch (error) {
        console.error(`Error getting models for ${provider}:`, error.message);
      }
    }
  }

  /**
   * Run a simulation with a user persona on documentation
   * @param {object} options - Simulation options
   */
  async runSimulation(options) {
    try {
      // Load persona
      const persona = this.personaManager.getPersona(options.persona);
      if (!persona) {
        console.error(`Persona "${options.persona}" not found.`);
        return;
      }
      
      console.log(`Using persona: ${persona.name}`);
      
      // Get LLM
      const llm = this.llmFactory.getLLM(options.model);
      const initialized = await llm.initialize();
      
      if (!initialized) {
        console.error(`Failed to initialize ${options.model} LLM.`);
        return;
      }
      
      console.log(`Using ${options.model} model: ${llm.getModelName()}`);
      
      // Check if the model supports browsing
      const useDirectBrowsing = llm.supportsBrowsing();
      let document;
      
      if (useDirectBrowsing) {
        console.log(`Model supports direct web browsing. Will access ${options.doc} directly.`);
        // Create a minimal document object with just the URL
        document = {
          url: options.doc,
          title: new URL(options.doc).pathname.split('/').pop() || 'Document',
          content: `This content will be accessed directly by the LLM via its browsing capability.`
        };
      } else {
        // Fetch documentation the traditional way
        console.log(`Fetching documentation from ${options.doc}...`);
        document = await this.documentFetcher.fetchFromUrl(options.doc);
        console.log(`Fetched: ${document.title}`);
      }
      
      // Run simulation
      if (options.interactive) {
        // Run interactive session
        await this.outputHandler.runInteractiveSession(
          persona,
          document,
          async (p, d, r) => await this.simulateResponse(llm, p, d, r, useDirectBrowsing)
        );
      } else {
        // Run single simulation
        console.log('Simulating response...');
        const response = await this.simulateResponse(llm, persona, document, options.request, useDirectBrowsing);
        
        console.log('\n--- Simulation Response ---\n');
        console.log(response);
        console.log('\n--------------------------\n');
        
        // Save to file
        const outputPath = options.output || this.outputHandler.outputDir;
        const savedPath = this.outputHandler.saveToFile(persona, document, options.request, response);
        console.log(`Saved simulation to ${savedPath}`);
      }
    } catch (error) {
      console.error('Error running simulation:', error.message);
    }
  }

  /**
   * Simulate a response using the LLM
   * @param {object} llm - The LLM instance
   * @param {object} persona - The user persona
   * @param {object} document - The documentation
   * @param {string} request - The user request
   * @param {boolean} useDirectBrowsing - Whether to use direct browsing capability
   * @returns {Promise<string>} - The simulated response
   */
  async simulateResponse(llm, persona, document, request, useDirectBrowsing = false) {
    if (useDirectBrowsing) {
      // Check if this is OpenAI which needs document content despite having browsing capability set
      if (llm instanceof require('./models/openai')) {
        // For OpenAI, we need to fetch the document content
        console.log(`OpenAI requires document content. Fetching from ${document.url}...`);
        
        // If document content is empty, fetch it
        if (!document.content || document.content.includes("accessed directly by the LLM")) {
          try {
            const fetchedDocument = await this.documentFetcher.fetchFromUrl(document.url);
            document.content = fetchedDocument.content;
            document.title = fetchedDocument.title;
            console.log(`Fetched content for OpenAI: ${document.title}`);
          } catch (error) {
            console.error(`Error fetching document for OpenAI: ${error.message}`);
            throw error;
          }
        }
        
        // Use the LLM's browsing method but pass the document content
        const { systemPrompt } = this.promptBuilder.createSimulationPrompt(
          persona,
          document,
          request
        );
        
        return await llm.generateWithBrowsing(document.url, request, { 
          systemPrompt,
          documentContent: document.content
        });
      } else {
        // Use the LLM's built-in browsing capability for other models
        const { systemPrompt } = this.promptBuilder.createSimulationPrompt(
          persona,
          document,
          request
        );
        
        return await llm.generateWithBrowsing(document.url, request, { systemPrompt });
      }
    }
    
    // For models without browsing capability, use compressed content approach
    // First, check if we need to process the content
    const MAX_CONTENT_SIZE = 8000; // Adjust based on model context limits
    let processedContent = document.content;
    
    if (document.content.length > MAX_CONTENT_SIZE) {
      console.log('Document is large, using content compression and extraction...');
      
      // Extract the most important content from the document
      processedContent = this.documentFetcher.extractImportantContent(document.content, MAX_CONTENT_SIZE);
      console.log(`Extracted important content (${processedContent.length} characters)`);
      
      // If still too large, apply compression
      if (processedContent.length > MAX_CONTENT_SIZE) {
        const compressionLevel = processedContent.length > MAX_CONTENT_SIZE * 1.5 ? { aggressive: true } : {};
        processedContent = this.documentFetcher.compressContent(processedContent, compressionLevel);
        console.log(`Compressed content to ${processedContent.length} characters`);
      }
    }
    
    // Create a modified document with the processed content
    const processedDocument = {
      ...document,
      content: processedContent
    };
    
    // Use standard approach with the processed document
    const { systemPrompt, userPrompt } = this.promptBuilder.createSimulationPrompt(
      persona,
      processedDocument,
      request
    );
    
    return await llm.generate(userPrompt, { systemPrompt });
  }

  /**
   * Parse command line arguments and run the CLI
   * @param {Array<string>} argv - Command line arguments
   */
  parse(argv) {
    this.initialize();
    this.program.parse(argv);
  }
}

module.exports = CLI;
