/**
 * PromptBuilder class for creating effective prompts for LLMs
 */
class PromptBuilder {
  /**
   * Create a simulation prompt based on persona, documentation, and user request
   * @param {object} persona - The user persona object
   * @param {object} document - The documentation object
   * @param {string} userRequest - The user's request or question
   * @returns {object} - Object containing system prompt and user prompt
   */
  createSimulationPrompt(persona, document, userRequest) {
    // Create system prompt that defines the persona and task
    const systemPrompt = this.createSystemPrompt(persona);
    
    // Create user prompt that includes the documentation and request
    const userPrompt = this.createUserPrompt(document, userRequest);
    
    return {
      systemPrompt,
      userPrompt
    };
  }

  /**
   * Create a system prompt that defines the persona and task
   * @param {object} persona - The user persona object
   * @returns {string} - The system prompt
   */
  createSystemPrompt(persona) {
    let systemPrompt = `You are simulating a user persona with the following characteristics:\n\n`;
    
    // Add persona details from the persona object
    systemPrompt += persona.toPrompt();
    
    // Add instructions for the simulation
    systemPrompt += `\n## Simulation Instructions\n`;
    systemPrompt += `- You are reviewing documentation as this user persona.\n`;
    systemPrompt += `- Respond to the documentation and questions as this persona would, based on their expertise, background, traits, goals, and preferences.\n`;
    systemPrompt += `- Be authentic to the persona's knowledge level - don't know things they wouldn't know.\n`;
    systemPrompt += `- Express confusion when appropriate for this persona's expertise level.\n`;
    systemPrompt += `- Use language and terminology consistent with this persona's background.\n`;
    systemPrompt += `- Focus on aspects of the documentation that would be most relevant or challenging for this persona.\n`;
    systemPrompt += `- If the persona would struggle with certain concepts, express that struggle in your response.\n`;
    systemPrompt += `- If the persona would have specific questions or need clarification, include those in your response.\n`;
    
    return systemPrompt;
  }

  /**
   * Create a user prompt that includes the documentation and request
   * @param {object} document - The documentation object
   * @param {string} userRequest - The user's request or question
   * @returns {string} - The user prompt
   */
  createUserPrompt(document, userRequest) {
    let userPrompt = `# Documentation to Review\n\n`;
    
    // Add document title and URL
    userPrompt += `Title: ${document.title}\n`;
    userPrompt += `URL: ${document.url}\n\n`;
    
    // Add document content
    userPrompt += `## Content\n\n${document.content}\n\n`;
    
    // Add user request
    userPrompt += `# Your Task\n\n${userRequest}\n\n`;
    
    // Add response instructions
    userPrompt += `Please respond as the user persona described in the system prompt. Consider how this persona would interact with this documentation based on their expertise, background, traits, goals, and preferences.`;
    
    return userPrompt;
  }

  /**
   * Create a chunked simulation prompt when document is too large
   * @param {object} persona - The user persona object
   * @param {Array<string>} documentChunks - Array of document content chunks
   * @param {object} documentMetadata - Document metadata (title, URL)
   * @param {string} userRequest - The user's request or question
   * @returns {Array<object>} - Array of prompt objects for sequential processing
   */
  createChunkedSimulationPrompts(persona, documentChunks, documentMetadata, userRequest) {
    const prompts = [];
    
    // Create system prompt that defines the persona and task
    const systemPrompt = this.createSystemPrompt(persona);
    
    // Create initial context prompt
    const initialPrompt = {
      systemPrompt,
      userPrompt: `# Documentation to Review (Part 1 of ${documentChunks.length})\n\n` +
        `Title: ${documentMetadata.title}\n` +
        `URL: ${documentMetadata.url}\n\n` +
        `## Content\n\n${documentChunks[0]}\n\n` +
        `This is part 1 of ${documentChunks.length} parts of the documentation. Please read and understand this part. ` +
        `You will receive the remaining parts in sequence. Do not respond yet.`
    };
    
    prompts.push(initialPrompt);
    
    // Create middle chunk prompts
    for (let i = 1; i < documentChunks.length - 1; i++) {
      const middlePrompt = {
        systemPrompt,
        userPrompt: `# Documentation to Review (Part ${i + 1} of ${documentChunks.length})\n\n` +
          `## Content\n\n${documentChunks[i]}\n\n` +
          `This is part ${i + 1} of ${documentChunks.length} parts of the documentation. Please read and understand this part. ` +
          `You will receive the remaining parts in sequence. Do not respond yet.`
      };
      
      prompts.push(middlePrompt);
    }
    
    // Create final prompt with user request
    const finalPrompt = {
      systemPrompt,
      userPrompt: `# Documentation to Review (Part ${documentChunks.length} of ${documentChunks.length})\n\n` +
        `## Content\n\n${documentChunks[documentChunks.length - 1]}\n\n` +
        `# Your Task\n\n${userRequest}\n\n` +
        `You have now received all ${documentChunks.length} parts of the documentation. ` +
        `Please respond as the user persona described in the system prompt. Consider how this persona would interact with this documentation based on their expertise, background, traits, goals, and preferences.`
    };
    
    prompts.push(finalPrompt);
    
    return prompts;
  }
}

module.exports = PromptBuilder;
