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
      .name('impersonaid')
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
      
    // Web interface command
    this.program
      .command('web')
      .description('Start the web interface')
      .option('-p, --port <port>', 'Port to run the web server on', '3000')
      .action((options) => this.startWebInterface(options));
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
    // Always use content-based approach for markdown content
    const isMarkdownContent = document.url === 'markdown://local';
    if (isMarkdownContent) {
      useDirectBrowsing = false;
    }
    
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
   * Start the web interface
   * @param {object} options - Web interface options
   */
  startWebInterface(options) {
    const port = options.port || process.env.PORT || 3000;
    
    try {
      // Dynamically require the web server to avoid loading it when not needed
      const path = require('path');
      const express = require('express');
      const http = require('http');
      const socketIo = require('socket.io');
      const cors = require('cors');
      
      // Create Express app
      const app = express();
      const server = http.createServer(app);
      const io = socketIo(server);
      
      // Middleware
      app.use(cors());
      app.use(express.json({ limit: '10mb' }));
      app.use(express.urlencoded({ extended: true, limit: '10mb' }));
      app.use(express.static(path.join(__dirname, 'web/public')));
      app.set('view engine', 'ejs');
      app.set('views', path.join(__dirname, 'web/views'));
      
      // Routes
      app.get('/', (req, res) => {
        res.render('index', {
          title: 'Impersonaid - Documentation Persona Simulator'
        });
      });
      
      // Persona management UI
      app.get('/personas', (req, res) => {
        res.render('personas', {
          title: 'Impersonaid - Persona Management'
        });
      });
      
      // API endpoints
      app.get('/api/personas', (req, res) => {
        const personas = this.personaManager.getPersonaNames();
        res.json({ personas });
      });
      
      // Get all personas with details
      app.get('/api/personas/all', (req, res) => {
        try {
          const personaMap = this.personaManager.loadAllPersonas();
          const personas = Array.from(personaMap.values());
          res.json({ success: true, personas });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
      
      // Get a specific persona
      app.get('/api/personas/:name', (req, res) => {
        try {
          const personaName = req.params.name;
          const persona = this.personaManager.getPersona(personaName);
          
          if (!persona) {
            return res.status(404).json({ success: false, message: `Persona "${personaName}" not found.` });
          }
          
          res.json({ success: true, persona });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
      
      // Save a persona
      app.post('/api/personas/save', express.json(), (req, res) => {
        try {
          const { persona } = req.body;
          
          if (!persona || !persona.name) {
            return res.status(400).json({ success: false, message: 'Invalid persona data' });
          }
          
          // Convert persona object to YAML and save it
          const yaml = require('js-yaml');
          const fs = require('fs');
          const path = require('path');
          
          const yamlContent = yaml.dump(persona);
          const fileName = persona.name.toLowerCase().replace(/\s+/g, '_') + '.yml';
          const filePath = path.join(this.personaManager.personasDir, fileName);
          
          fs.writeFileSync(filePath, yamlContent, 'utf8');
          
          // Reload personas
          this.personaManager.loadAllPersonas();
          
          res.json({ success: true, message: 'Persona saved successfully' });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
      
      // Delete a persona
      app.delete('/api/personas/:name', (req, res) => {
        try {
          const personaName = req.params.name;
          const persona = this.personaManager.getPersona(personaName);
          
          if (!persona) {
            return res.status(404).json({ success: false, message: `Persona "${personaName}" not found.` });
          }
          
          // Delete the persona file
          const fs = require('fs');
          const path = require('path');
          
          const fileName = personaName.toLowerCase().replace(/\s+/g, '_') + '.yml';
          const filePath = path.join(this.personaManager.personasDir, fileName);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          // Reload personas
          this.personaManager.loadAllPersonas();
          
          res.json({ success: true, message: 'Persona deleted successfully' });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
      
      app.get('/api/models', (req, res) => {
        const providers = this.llmFactory.getSupportedProviders();
        const models = {};
        
        providers.forEach(provider => {
          models[provider] = config.getDefaultModel(provider);
        });
        
        res.json({ providers, models });
      });
      
      // Handle WebSocket connections
      io.on('connection', (socket) => {
        console.log('Client connected');
        
        // Helper function to log status to CLI only
        const logStatus = (message) => {
          console.log(`[Status] ${message}`);
        };
        
        // Helper function to log status to both CLI and client
        const logUIStatus = (message) => {
          console.log(`[Status] ${message}`);
          socket.emit('status', { message });
        };
        
        // Handle combined document submission and simulation request
        socket.on('simulate-with-document', async (data) => {
          try {
            // Process document
            let document;
            
            if (data.documentType === 'url') {
              // Fetch document from URL
              logStatus(`Fetching document from ${data.documentUrl}...`);
              document = await this.documentFetcher.fetchFromUrl(data.documentUrl);
              logStatus(`Fetched document: ${document.title}`);
            } else {
              // Use provided markdown content
              logStatus('Processing provided markdown content...');
              document = {
                url: 'markdown://local',
                title: 'Provided Markdown Document',
                content: data.markdownContent
              };
            }
            
            // Get persona
            logStatus(`Using persona: ${data.persona}`);
            const persona = this.personaManager.getPersona(data.persona);
            if (!persona) {
              const errorMsg = `Persona "${data.persona}" not found.`;
              console.error(`[Error] ${errorMsg}`);
              socket.emit('error', { message: errorMsg });
              return;
            }
            
            // Get LLM
            logStatus(`Initializing ${data.model} model...`);
            const llm = this.llmFactory.getLLM(data.model);
            const initialized = await llm.initialize();
            
            if (!initialized) {
              const errorMsg = `Failed to initialize ${data.model} LLM.`;
              console.error(`[Error] ${errorMsg}`);
              socket.emit('error', { message: errorMsg });
              return;
            }
            
            logStatus(`Using ${data.model} model: ${llm.getModelName()}`);
            
            // For markdown content, always use the direct content approach, not browsing
            const isMarkdownContent = document.url === 'markdown://local';
            const useDirectBrowsing = !isMarkdownContent && llm.supportsBrowsing();
            
            if (useDirectBrowsing) {
              logStatus(`Using direct browsing capability for ${data.model}`);
            } else {
              // Show processing status in UI
              logUIStatus('Processing document content...');
            }
            
            // Show generation status in UI
            logUIStatus('Generating response...');
            
            const response = await this.simulateResponse(llm, persona, document, data.request, useDirectBrowsing);
            
            // Send response to client
            logStatus('Response generated successfully');
            socket.emit('response', { 
              persona: data.persona,
              request: data.request,
              response
            });
            
            console.log('-----------------------------------');
            console.log(`Request: ${data.request}`);
            console.log(`Persona: ${data.persona}`);
            console.log(`Model: ${data.model}`);
            console.log('Response generated successfully');
            console.log('-----------------------------------');
            
          } catch (error) {
            const errorMsg = `Error generating response: ${error.message}`;
            console.error(`[Error] ${errorMsg}`);
            socket.emit('error', { message: errorMsg });
          }
        });
        
        socket.on('disconnect', () => {
          console.log('Client disconnected');
        });
      });
      
      // Start server
      server.listen(port, () => {
        console.log(`Impersonaid web interface running at http://localhost:${port}`);
        console.log('Press Ctrl+C to stop');
      });
      
    } catch (error) {
      console.error('Error starting web interface:', error.message);
      console.error('Make sure you have installed the required dependencies:');
      console.error('npm install express socket.io cors ejs');
    }
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
