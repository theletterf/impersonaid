const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * OutputHandler class for managing simulation outputs
 */
class OutputHandler {
  constructor(config) {
    this.config = config;
    this.outputConfig = config.getOutputConfig();
    this.outputDir = this.outputConfig.output_dir;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Save simulation response to a file
   * @param {object} persona - The user persona used
   * @param {object} document - The documentation object
   * @param {string} userRequest - The user's request or question
   * @param {string} response - The LLM response
   * @returns {string} - Path to the saved file
   */
  saveToFile(persona, document, userRequest, response) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${persona.name}_${timestamp}.md`;
      const outputPath = path.join(this.outputDir, filename);
      
      let content = `# User Persona Simulation: ${persona.name}\n\n`;
      content += `- **Date**: ${new Date().toISOString()}\n`;
      content += `- **Document**: ${document.title}\n`;
      content += `- **URL**: ${document.url}\n\n`;
      
      content += `## User Request\n\n${userRequest}\n\n`;
      content += `## Persona Details\n\n`;
      content += persona.toPrompt();
      content += `\n\n## Simulation Response\n\n${response}\n`;
      
      fs.writeFileSync(outputPath, content);
      return outputPath;
    } catch (error) {
      console.error('Error saving simulation to file:', error.message);
      throw error;
    }
  }

  /**
   * Run an interactive session with the user
   * @param {object} persona - The user persona
   * @param {object} document - The documentation object
   * @param {function} simulateFunction - Function to call for simulation
   * @returns {Promise<void>}
   */
  async runInteractiveSession(persona, document, simulateFunction) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`\n===== Interactive Session with ${persona.name} =====`);
    console.log(`Document: ${document.title}`);
    console.log(`URL: ${document.url}`);
    console.log('\nEnter your questions or requests. Type "exit" to end the session.\n');
    
    const askQuestion = () => {
      return new Promise((resolve) => {
        rl.question('> ', async (userRequest) => {
          if (userRequest.toLowerCase() === 'exit') {
            resolve(false);
            return;
          }
          
          try {
            console.log('\nSimulating response...\n');
            const response = await simulateFunction(persona, document, userRequest);
            console.log(`\n${response}\n`);
          } catch (error) {
            console.error('Error in simulation:', error.message);
          }
          
          resolve(true);
        });
      });
    };
    
    let continueSession = true;
    while (continueSession) {
      continueSession = await askQuestion();
    }
    
    console.log('\nEnding interactive session.');
    rl.close();
  }

  /**
   * Format a simulation response for display
   * @param {string} response - The raw LLM response
   * @returns {string} - Formatted response
   */
  formatResponse(response) {
    // Add any formatting needed for display
    return response;
  }
}

module.exports = OutputHandler;
