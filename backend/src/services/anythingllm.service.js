const fetch = require('node-fetch');
const { VectorDBService } = require('./vectordb.service');
const { logger } = require('../utils/logger');

class AnythingLLMService {
  constructor() {
    this.baseURL = process.env.ANYTHINGLLM_URL || 'http://localhost:3001';
    this.apiKey = process.env.ANYTHINGLLM_API_KEY;
    this.vectorDB = new VectorDBService();
  }

  /**
   * Send message to Claude via AnythingLLM with RAG context
   */
  async sendMessage(projectId, message, options = {}) {
    try {
      logger.info(`Sending message for project ${projectId}`);

      // 1. Retrieve relevant context from vector DB
      const relevantContext = await this.vectorDB.queryRelevantFiles(
        projectId,
        message,
        options.contextSize || 5
      );

      // 2. Build enriched prompt with context
      const enrichedPrompt = this.buildEnrichedPrompt(
        message,
        relevantContext,
        options
      );

      logger.debug('Enriched prompt built', { 
        contextFiles: relevantContext.files?.length || 0 
      });

      // 3. Send to AnythingLLM (which uses Claude)
      const response = await fetch(
        `${this.baseURL}/api/v1/workspace/${projectId}/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: enrichedPrompt,
            mode: options.mode || 'chat',
            model: 'claude-sonnet-4-20250514'
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AnythingLLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 4. Parse response to extract generated files
      const parsedResponse = this.parseClaudeResponse(data.textResponse || '');

      logger.info(`Response parsed: ${parsedResponse.files.length} files generated`);

      return {
        message: parsedResponse.message,
        generatedFiles: parsedResponse.files,
        thinking: parsedResponse.thinking,
        rawResponse: data
      };

    } catch (error) {
      logger.error('AnythingLLM Service Error:', error);
      throw error;
    }
  }

  /**
   * Build enriched prompt with project context
   */
  buildEnrichedPrompt(userMessage, context, options) {
    let prompt = `# Project Context\n\n`;

    // Add relevant files from context
    if (context.files && context.files.length > 0) {
      prompt += `## Relevant Files:\n\n`;
      context.files.forEach(file => {
        prompt += `### ${file.path}\n`;
        prompt += `\`\`\`${file.language || 'text'}\n`;
        prompt += `${file.content}\n`;
        prompt += `\`\`\`\n\n`;
      });
    }

    // Add project structure
    if (context.structure) {
      prompt += `## Project Structure:\n\`\`\`\n${context.structure}\n\`\`\`\n\n`;
    }

    // Add instructions for file generation
    prompt += `# Instructions\n\n`;
    prompt += `You are helping develop a software project. When generating code:\n`;
    prompt += `1. Generate complete, production-ready code\n`;
    prompt += `2. Follow the existing project structure and conventions\n`;
    prompt += `3. Include all necessary imports and dependencies\n`;
    prompt += `4. Wrap each file in XML tags with path and language:\n\n`;
    prompt += `<file path="src/components/Button.jsx" language="javascript">\n`;
    prompt += `// file content here\n`;
    prompt += `</file>\n\n`;
    prompt += `5. You can generate multiple files in one response\n`;
    prompt += `6. Make sure code is ready to run without modifications\n\n`;

    // Add specific mode instructions
    if (options.mode === 'refactor') {
      prompt += `Focus on refactoring existing code while maintaining functionality.\n\n`;
    } else if (options.mode === 'test') {
      prompt += `Generate comprehensive tests for the code.\n\n`;
    }

    prompt += `# User Request\n\n${userMessage}`;

    return prompt;
  }

  /**
   * Parse Claude's response to extract generated files
   */
  parseClaudeResponse(responseText) {
    const files = [];

    // Regex to extract files from XML format
    const fileRegex = /<file\s+path="([^"]+)"\s+language="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;

    let cleanedMessage = responseText;

    while ((match = fileRegex.exec(responseText)) !== null) {
      const [fullMatch, path, language, content] = match;

      files.push({
        path: path.trim(),
        language: language.trim(),
        content: content.trim()
      });

      // Remove file block from message
      cleanedMessage = cleanedMessage.replace(fullMatch, '');
    }

    return {
      message: this.cleanMessage(cleanedMessage),
      files,
      thinking: this.extractThinking(responseText)
    };
  }

  /**
   * Extract thinking blocks from response
   */
  extractThinking(text) {
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    return thinkingMatch ? thinkingMatch[1].trim() : null;
  }

  /**
   * Clean message from XML tags and extra whitespace
   */
  cleanMessage(text) {
    return text
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Update project context in vector DB
   */
  async updateProjectContext(projectId, files) {
    try {
      await this.vectorDB.upsertFiles(projectId, files);
      logger.info(`Updated context for project ${projectId}: ${files.length} files`);
    } catch (error) {
      logger.error('Error updating project context:', error);
      throw error;
    }
  }

  /**
   * Create or get workspace in AnythingLLM
   */
  async ensureWorkspace(projectId, projectName) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/workspace/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      }

      // Create workspace if doesn't exist
      const createResponse = await fetch(`${this.baseURL}/api/v1/workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectId,
          slug: projectId,
          description: projectName
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create workspace');
      }

      return await createResponse.json();

    } catch (error) {
      logger.error('Error ensuring workspace:', error);
      throw error;
    }
  }
}

module.exports = { AnythingLLMService };
