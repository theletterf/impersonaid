document.addEventListener('DOMContentLoaded', () => {
  // Connect to WebSocket server
  const socket = io();
  
  // DOM Elements
  const urlRadio = document.getElementById('urlRadio');
  const markdownRadio = document.getElementById('markdownRadio');
  const urlInputContainer = document.getElementById('urlInputContainer');
  const markdownInputContainer = document.getElementById('markdownInputContainer');
  const documentUrl = document.getElementById('documentUrl');
  const markdownContent = document.getElementById('markdownContent');
  const personaSelect = document.getElementById('personaSelect');
  const modelSelect = document.getElementById('modelSelect');
  const chatContainer = document.getElementById('chatContainer');
  const userRequest = document.getElementById('userRequest');
  const sendRequestBtn = document.getElementById('sendRequestBtn');
  
  // Toggle between URL and Markdown input
  urlRadio.addEventListener('change', () => {
    if (urlRadio.checked) {
      urlInputContainer.classList.remove('d-none');
      markdownInputContainer.classList.add('d-none');
    }
  });
  
  markdownRadio.addEventListener('change', () => {
    if (markdownRadio.checked) {
      urlInputContainer.classList.add('d-none');
      markdownInputContainer.classList.remove('d-none');
    }
  });
  
  // Send user request
  sendRequestBtn.addEventListener('click', sendRequest);
  userRequest.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendRequest();
    }
  });
  
  function sendRequest() {
    const request = userRequest.value.trim();
    if (!request) {
      addStatusMessage('Please enter a request');
      return;
    }
    
    const persona = personaSelect.value;
    if (!persona) {
      addStatusMessage('Please select a persona');
      return;
    }
    
    const model = modelSelect.value;
    if (!model) {
      addStatusMessage('Please select a model');
      return;
    }
    
    // Get document info based on selected type
    let documentInfo = {};
    
    if (urlRadio.checked) {
      const url = documentUrl.value.trim();
      if (!url) {
        addStatusMessage('Please enter a valid URL');
        return;
      }
      documentInfo = {
        documentType: 'url',
        documentUrl: url
      };
    } else {
      const content = markdownContent.value.trim();
      if (!content) {
        addStatusMessage('Please enter some markdown content');
        return;
      }
      documentInfo = {
        documentType: 'markdown',
        markdownContent: content
      };
    }
    
    // Add user message to chat
    addUserMessage(request);
    
    // Clear input
    userRequest.value = '';
    
    // Send request to server with document info
    socket.emit('simulate-with-document', {
      ...documentInfo,
      persona,
      model,
      request
    });
    
    // Show loading indicator
    addSystemMessage('Processing request...');
  }
  
  // Socket event handlers
  socket.on('connect', () => {
    addStatusMessage('Connected to server');
    loadPersonas();
    loadModels();
  });
  
  socket.on('status', (data) => {
    addStatusMessage(data.message);
  });
  
  socket.on('error', (data) => {
    addStatusMessage(`Error: ${data.message}`, true);
  });
  
  socket.on('document-ready', (data) => {
    addSystemMessage(`Document loaded: ${data.title}`);
  });
  
  socket.on('response', (data) => {
    addPersonaMessage(data.persona, data.response);
  });
  
  // Helper functions
  function loadPersonas() {
    fetch('/api/personas')
      .then(response => response.json())
      .then(data => {
        personaSelect.innerHTML = '<option value="" selected disabled>Select a persona</option>';
        data.personas.forEach(persona => {
          const option = document.createElement('option');
          option.value = persona;
          option.textContent = persona;
          personaSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading personas:', error);
        addStatusMessage('Error loading personas', true);
      });
  }
  
  function loadModels() {
    fetch('/api/models')
      .then(response => response.json())
      .then(data => {
        modelSelect.innerHTML = '<option value="" selected disabled>Select a model</option>';
        data.providers.forEach(provider => {
          const option = document.createElement('option');
          option.value = provider;
          option.textContent = `${provider} (${data.models[provider]})`;
          modelSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading models:', error);
        addStatusMessage('Error loading models', true);
      });
  }
  
  function addStatusMessage(message, isError = false) {
    // Add status message directly to chat
    addSystemMessage(message, isError);
  }
  
  function clearChat() {
    chatContainer.innerHTML = '';
  }
  
  function addSystemMessage(message, isError = false) {
    const div = document.createElement('div');
    div.className = isError ? 'system-message error' : 'system-message';
    div.textContent = message;
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  function addUserMessage(message) {
    const div = document.createElement('div');
    div.className = 'message user-message';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = 'You';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message;
    
    div.appendChild(header);
    div.appendChild(content);
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  function addPersonaMessage(persona, message) {
    const div = document.createElement('div');
    div.className = 'message persona-message';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = persona;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = marked.parse(message);
    
    div.appendChild(header);
    div.appendChild(content);
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});
