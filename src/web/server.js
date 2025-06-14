const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { PersonaManager } = require('../personas/persona');
const DocumentFetcher = require('../utils/document-fetcher');
const LLMFactory = require('../models');
const config = require('../config/config');

// Try to load configuration
try {
  const configPath = path.join(process.cwd(), 'config.toml');
  config.loadFromFile(configPath);
} catch (error) {
  console.warn('Warning: Could not load config.toml. Using default settings.');
}

// Initialize components
const personaManager = new PersonaManager();
const documentFetcher = new DocumentFetcher();
const llmFactory = new LLMFactory(config);

// Load personas
personaManager.loadAllPersonas();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Impersonaid - Documentation Persona Simulator'
  });
});

// API endpoints
app.get('/api/personas', (req, res) => {
  const personas = personaManager.getPersonaNames();
  res.json({ personas });
});

app.get('/api/models', (req, res) => {
  const providers = llmFactory.getSupportedProviders();
  const models = {};
  
  providers.forEach(provider => {
    models[provider] = config.getDefaultModel(provider);
  });
  
  res.json({ providers, models });
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Handle document submission (URL or markdown)
  socket.on('submit-document', async (data) => {
    try {
      let document;
      
      if (data.documentType === 'url') {
        // Fetch document from URL
        socket.emit('status', { message: `Fetching document from ${data.documentUrl}...` });
        document = await documentFetcher.fetchFromUrl(data.documentUrl);
      } else {
        // Use provided markdown content
        document = {
          url: 'markdown://local',
          title: 'Provided Markdown Document',
          content: data.markdownContent
        };
      }
      
      // Store document in session
      socket.document = document;
      
      socket.emit('document-ready', { 
        title: document.title,
        contentPreview: document.content.substring(0, 200) + '...'
      });
      
    } catch (error) {
      socket.emit('error', { message: `Error processing document: ${error.message}` });
    }
  });
  
  // Handle simulation request
  socket.on('simulate', async (data) => {
    try {
      // Get document
      const document = socket.document;
      if (!document) {
        socket.emit('error', { message: 'No document available. Please submit a document first.' });
        return;
      }
      
      // Get persona
      const persona = personaManager.getPersona(data.persona);
      if (!persona) {
        socket.emit('error', { message: `Persona "${data.persona}" not found.` });
        return;
      }
      
      // Get LLM
      const llm = llmFactory.getLLM(data.model);
      const initialized = await llm.initialize();
      
      if (!initialized) {
        socket.emit('error', { message: `Failed to initialize ${data.model} LLM.` });
        return;
      }
      
      socket.emit('status', { message: `Using ${data.model} model: ${llm.getModelName()}` });
      
      // Process document if needed
      let processedContent = document.content;
      const useDirectBrowsing = llm.supportsBrowsing();
      
      // Check if this is OpenAI which needs document content despite having browsing capability set
      if (llm.constructor.name === 'OpenAILLM') {
        socket.emit('status', { message: 'Processing document content for OpenAI...' });
        
        // Extract and compress content if needed
        const MAX_CONTENT_SIZE = 8000;
        
        if (processedContent.length > MAX_CONTENT_SIZE) {
          socket.emit('status', { message: 'Document is large, extracting important content...' });
          processedContent = documentFetcher.extractImportantContent(processedContent, MAX_CONTENT_SIZE);
          
          if (processedContent.length > MAX_CONTENT_SIZE) {
            const compressionLevel = processedContent.length > MAX_CONTENT_SIZE * 1.5 ? { aggressive: true } : {};
            processedContent = documentFetcher.compressContent(processedContent, compressionLevel);
            socket.emit('status', { message: `Compressed content to ${processedContent.length} characters` });
          }
        }
        
        // Create a modified document with the processed content
        const processedDocument = {
          ...document,
          content: processedContent
        };
        
        // Generate response
        socket.emit('status', { message: 'Generating response...' });
        
        // Create system prompt for persona
        const systemPrompt = `You are simulating a user persona with the following characteristics:

${persona.toPrompt()}

Respond to the documentation and questions as this persona would, based on their expertise, background, traits, goals, and preferences.`;
        
        // Generate response with document content
        const response = await llm.generateWithBrowsing(document.url, data.request, { 
          systemPrompt,
          documentContent: processedContent
        });
        
        // Send response to client
        socket.emit('response', { 
          persona: data.persona,
          request: data.request,
          response
        });
        
      } else if (useDirectBrowsing) {
        // Use the LLM's built-in browsing capability
        socket.emit('status', { message: `Model supports direct web browsing. Will access ${document.url} directly.` });
        
        // Create system prompt for persona
        const systemPrompt = `You are simulating a user persona with the following characteristics:

${persona.toPrompt()}

Respond to the documentation and questions as this persona would, based on their expertise, background, traits, goals, and preferences.`;
        
        // Generate response with browsing
        socket.emit('status', { message: 'Generating response...' });
        const response = await llm.generateWithBrowsing(document.url, data.request, { systemPrompt });
        
        // Send response to client
        socket.emit('response', { 
          persona: data.persona,
          request: data.request,
          response
        });
        
      } else {
        // For models without browsing capability, use compressed content approach
        socket.emit('status', { message: 'Processing document content...' });
        
        // Extract and compress content if needed
        const MAX_CONTENT_SIZE = 8000;
        
        if (processedContent.length > MAX_CONTENT_SIZE) {
          socket.emit('status', { message: 'Document is large, extracting important content...' });
          processedContent = documentFetcher.extractImportantContent(processedContent, MAX_CONTENT_SIZE);
          
          if (processedContent.length > MAX_CONTENT_SIZE) {
            const compressionLevel = processedContent.length > MAX_CONTENT_SIZE * 1.5 ? { aggressive: true } : {};
            processedContent = documentFetcher.compressContent(processedContent, compressionLevel);
            socket.emit('status', { message: `Compressed content to ${processedContent.length} characters` });
          }
        }
        
        // Create a modified document with the processed content
        const processedDocument = {
          ...document,
          content: processedContent
        };
        
        // Create system prompt for persona
        const systemPrompt = `You are simulating a user persona with the following characteristics:

${persona.toPrompt()}

Respond to the documentation and questions as this persona would, based on their expertise, background, traits, goals, and preferences.`;
        
        // Create user prompt with document content
        const userPrompt = `# Documentation to Review

Title: ${processedDocument.title}
URL: ${processedDocument.url}

## Content

${processedDocument.content}

# Your Task

${data.request}

Please respond as the user persona described in the system prompt. Consider how this persona would interact with this documentation based on their expertise, background, traits, goals, and preferences.`;
        
        // Generate response
        socket.emit('status', { message: 'Generating response...' });
        const response = await llm.generate(userPrompt, { systemPrompt });
        
        // Send response to client
        socket.emit('response', { 
          persona: data.persona,
          request: data.request,
          response
        });
      }
      
    } catch (error) {
      socket.emit('error', { message: `Error generating response: ${error.message}` });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Impersonaid web server running on http://localhost:${PORT}`);
});

module.exports = server;
