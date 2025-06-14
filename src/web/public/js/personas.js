document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const personaList = document.getElementById('personaList');
  const createPersonaBtn = document.getElementById('createPersonaBtn');
  const savePersonaBtn = document.getElementById('savePersonaBtn');
  const deletePersonaBtn = document.getElementById('deletePersonaBtn');
  const editorPlaceholder = document.getElementById('editorPlaceholder');
  const editorCard = document.getElementById('editorCard');
  const yamlPreviewCard = document.getElementById('yamlPreviewCard');
  const yamlPreview = document.getElementById('yamlPreview');
  const personaForm = document.getElementById('personaForm');
  const addGoalBtn = document.getElementById('addGoalBtn');
  const goalsContainer = document.getElementById('goalsContainer');
  
  // State
  let currentPersona = null;
  let personas = [];
  
  // Load personas
  loadPersonas();
  
  // Event listeners
  createPersonaBtn.addEventListener('click', createNewPersona);
  savePersonaBtn.addEventListener('click', savePersona);
  deletePersonaBtn.addEventListener('click', deletePersona);
  addGoalBtn.addEventListener('click', addGoalInput);
  
  // Form change listener for YAML preview
  document.querySelectorAll('#personaForm input, #personaForm textarea, #personaForm select').forEach(el => {
    el.addEventListener('input', updateYamlPreview);
  });
  
  // Functions
  async function loadPersonas() {
    try {
      const response = await fetch('/api/personas/all');
      const data = await response.json();
      personas = data.personas;
      
      renderPersonaList();
    } catch (error) {
      showError('Error loading personas: ' + error.message);
    }
  }
  
  function renderPersonaList() {
    personaList.innerHTML = '';
    
    personas.forEach(persona => {
      const item = document.createElement('button');
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.dataset.name = persona.name;
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = persona.name;
      
      const badge = document.createElement('span');
      badge.className = `badge bg-${getExpertiseBadgeColor(persona.expertise.technical)}`;
      badge.textContent = persona.expertise.technical;
      
      item.appendChild(nameSpan);
      item.appendChild(badge);
      
      item.addEventListener('click', () => loadPersonaDetails(persona.name));
      
      personaList.appendChild(item);
    });
  }
  
  function getExpertiseBadgeColor(expertise) {
    const colors = {
      'Novice': 'secondary',
      'Beginner': 'info',
      'Intermediate': 'primary',
      'Advanced': 'success',
      'Expert': 'danger'
    };
    
    return colors[expertise] || 'secondary';
  }
  
  async function loadPersonaDetails(personaName) {
    try {
      const response = await fetch(`/api/personas/${encodeURIComponent(personaName)}`);
      const data = await response.json();
      
      if (data.success) {
        currentPersona = data.persona;
        displayPersonaInEditor(currentPersona);
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Error loading persona details: ' + error.message);
    }
  }
  
  function displayPersonaInEditor(persona) {
    // Show editor and hide placeholder
    editorPlaceholder.classList.add('d-none');
    editorCard.classList.remove('d-none');
    yamlPreviewCard.classList.remove('d-none');
    
    // Fill form fields
    document.getElementById('personaName').value = persona.name;
    document.getElementById('personaDescription').value = persona.description;
    
    // Expertise
    document.getElementById('technicalExpertise').value = persona.expertise.technical;
    document.getElementById('domainExpertise').value = persona.expertise.domain;
    document.getElementById('toolsExpertise').value = persona.expertise.tools;
    
    // Background
    document.getElementById('education').value = persona.background.education;
    document.getElementById('experience').value = persona.background.experience;
    
    // Traits
    document.getElementById('patience').value = persona.traits.patience;
    document.getElementById('attentionToDetail').value = persona.traits.attention_to_detail;
    document.getElementById('learningStyle').value = persona.traits.learning_style;
    
    // Goals
    goalsContainer.innerHTML = '';
    persona.goals.forEach(goal => {
      addGoalInput(goal);
    });
    
    // Preferences
    document.getElementById('documentationStyle').value = persona.preferences.documentation_style;
    document.getElementById('communication').value = persona.preferences.communication;
    
    // Update YAML preview
    updateYamlPreview();
  }
  
  function createNewPersona() {
    // Create a template persona
    currentPersona = {
      name: 'New Persona',
      description: 'Description of the new persona',
      expertise: {
        technical: 'Intermediate',
        domain: 'Moderate',
        tools: 'Familiar with common tools'
      },
      background: {
        education: 'Relevant education',
        experience: 'Relevant experience'
      },
      traits: {
        patience: 'Moderate',
        attention_to_detail: 'Moderate',
        learning_style: 'Balanced learning approach'
      },
      goals: [
        'Primary goal',
        'Secondary goal'
      ],
      preferences: {
        documentation_style: 'Preferred documentation style',
        communication: 'Preferred communication style'
      }
    };
    
    displayPersonaInEditor(currentPersona);
  }
  
  function addGoalInput(goalText = '') {
    const goalDiv = document.createElement('div');
    goalDiv.className = 'input-group mb-2 goal-input';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.placeholder = 'Enter a goal';
    input.value = goalText;
    
    const buttonDiv = document.createElement('button');
    buttonDiv.className = 'btn btn-outline-secondary remove-goal';
    buttonDiv.type = 'button';
    buttonDiv.innerHTML = '<i class="bi bi-x"></i>';
    buttonDiv.addEventListener('click', () => {
      goalDiv.remove();
      updateYamlPreview();
    });
    
    goalDiv.appendChild(input);
    goalDiv.appendChild(buttonDiv);
    
    goalsContainer.appendChild(goalDiv);
    
    input.addEventListener('input', updateYamlPreview);
    
    return goalDiv;
  }
  
  function updateYamlPreview() {
    const personaData = getFormData();
    if (!personaData) return;
    
    try {
      const yamlString = jsyaml.dump(personaData);
      yamlPreview.textContent = yamlString;
    } catch (error) {
      yamlPreview.textContent = 'Error generating YAML: ' + error.message;
    }
  }
  
  function getFormData() {
    // Get all form values
    const name = document.getElementById('personaName').value;
    const description = document.getElementById('personaDescription').value;
    
    // Expertise
    const technical = document.getElementById('technicalExpertise').value;
    const domain = document.getElementById('domainExpertise').value;
    const tools = document.getElementById('toolsExpertise').value;
    
    // Background
    const education = document.getElementById('education').value;
    const experience = document.getElementById('experience').value;
    
    // Traits
    const patience = document.getElementById('patience').value;
    const attentionToDetail = document.getElementById('attentionToDetail').value;
    const learningStyle = document.getElementById('learningStyle').value;
    
    // Goals
    const goals = [];
    document.querySelectorAll('#goalsContainer input').forEach(input => {
      if (input.value.trim()) {
        goals.push(input.value.trim());
      }
    });
    
    // Preferences
    const documentationStyle = document.getElementById('documentationStyle').value;
    const communication = document.getElementById('communication').value;
    
    // Create persona object
    return {
      name,
      description,
      expertise: {
        technical,
        domain,
        tools
      },
      background: {
        education,
        experience
      },
      traits: {
        patience,
        attention_to_detail: attentionToDetail,
        learning_style: learningStyle
      },
      goals,
      preferences: {
        documentation_style: documentationStyle,
        communication
      }
    };
  }
  
  async function savePersona() {
    const personaData = getFormData();
    if (!personaData) return;
    
    try {
      const response = await fetch('/api/personas/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ persona: personaData })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess('Persona saved successfully');
        loadPersonas(); // Refresh the list
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Error saving persona: ' + error.message);
    }
  }
  
  async function deletePersona() {
    if (!currentPersona || !currentPersona.name) return;
    
    if (!confirm(`Are you sure you want to delete the persona "${currentPersona.name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/personas/${encodeURIComponent(currentPersona.name)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess('Persona deleted successfully');
        currentPersona = null;
        editorCard.classList.add('d-none');
        yamlPreviewCard.classList.add('d-none');
        editorPlaceholder.classList.remove('d-none');
        loadPersonas(); // Refresh the list
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Error deleting persona: ' + error.message);
    }
  }
  
  function showError(message) {
    alert(message); // Simple error handling for now
  }
  
  function showSuccess(message) {
    alert(message); // Simple success handling for now
  }
});
