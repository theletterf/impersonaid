const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');

/**
 * DocumentFetcher class for retrieving and processing documentation content
 */
class DocumentFetcher {
  /**
   * Fetch content from a URL
   * @param {string} docUrl - URL to fetch content from
   * @returns {Promise<object>} - Object containing the document content and metadata
   */
  async fetchFromUrl(docUrl) {
    try {
      const response = await axios.get(docUrl, {
        headers: {
          'User-Agent': 'LLM-Docs-Persona-Simulator/1.0.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers['content-type'] || '';
      let content = '';
      let title = '';
      let metadata = {};

      if (contentType.includes('text/html')) {
        const $ = cheerio.load(response.data);
        
        // Extract title
        title = $('title').text() || path.basename(docUrl);
        
        // Extract metadata
        $('meta').each((i, elem) => {
          const name = $(elem).attr('name') || $(elem).attr('property');
          const content = $(elem).attr('content');
          if (name && content) {
            metadata[name] = content;
          }
        });
        
        // Extract main content
        // Try to find the main content area using common selectors
        const mainSelectors = [
          'main', 
          'article', 
          '.content', 
          '.main-content', 
          '.documentation', 
          '.docs-content',
          '#content',
          '#main'
        ];
        
        let mainContent = '';
        for (const selector of mainSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            mainContent = element.text();
            break;
          }
        }
        
        // If no main content found, use the body content
        if (!mainContent) {
          // Remove script, style, nav, header, footer elements
          $('script, style, nav, header, footer').remove();
          mainContent = $('body').text();
        }
        
        // Clean up the content
        content = this.cleanContent(mainContent);
      } else if (contentType.includes('application/json')) {
        // Handle JSON content
        content = JSON.stringify(response.data, null, 2);
        title = path.basename(docUrl);
      } else if (contentType.includes('text/plain')) {
        // Handle plain text content
        content = response.data;
        title = path.basename(docUrl);
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      return {
        url: docUrl,
        title,
        content,
        metadata,
        contentType
      };
    } catch (error) {
      console.error(`Error fetching document from ${docUrl}:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up the content by removing extra whitespace and normalizing line breaks
   * @param {string} content - Content to clean
   * @returns {string} - Cleaned content
   */
  cleanContent(content) {
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Compress document content for efficient processing
   * @param {string} content - Content to compress
   * @param {object} options - Compression options
   * @param {boolean} options.aggressive - Whether to use aggressive compression
   * @returns {string} - Compressed content
   */
  compressContent(content, options = {}) {
    const aggressive = options.aggressive || false;
    
    // Basic compression: remove extra whitespace and normalize line breaks
    let compressed = content
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n');
    
    if (aggressive) {
      // Aggressive compression for very large documents
      compressed = compressed
        .replace(/\s+/g, ' ')  // Replace all whitespace sequences with a single space
        .replace(/\n/g, ' ')   // Replace newlines with spaces
        .replace(/\t/g, ' ')   // Replace tabs with spaces
        .replace(/ {2,}/g, ' ') // Replace multiple spaces with a single space
        .trim();
    }
    
    return compressed;
  }

  /**
   * Extract the most important content from a document
   * @param {string} content - Full document content
   * @param {number} maxLength - Maximum desired length
   * @returns {string} - Extracted important content
   */
  extractImportantContent(content, maxLength = 8000) {
    if (content.length <= maxLength) {
      return content;
    }
    
    // If content is too large, extract the most important parts
    
    // 1. Extract title and headings with their content
    const headingPattern = /#{1,6}\s+(.+?)(?=\n|$)|<h[1-6][^>]*>(.+?)<\/h[1-6]>/gi;
    const headings = [];
    let match;
    
    while ((match = headingPattern.exec(content)) !== null) {
      headings.push({
        heading: match[1] || match[2],
        position: match.index
      });
    }
    
    // 2. Extract content sections based on headings
    const sections = [];
    
    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].position;
      const end = (i < headings.length - 1) ? headings[i + 1].position : content.length;
      
      // Get section content (limited to avoid extremely long sections)
      const sectionContent = content.substring(start, end).substring(0, 1000);
      sections.push(sectionContent);
    }
    
    // 3. If no headings found, extract beginning and end of document
    if (sections.length === 0) {
      const beginning = content.substring(0, Math.floor(maxLength * 0.6));
      const end = content.substring(content.length - Math.floor(maxLength * 0.4));
      return beginning + '\n...\n' + end;
    }
    
    // 4. Combine sections to fit within maxLength
    let result = '';
    let remainingLength = maxLength;
    
    // Always include first section (usually introduction)
    if (sections.length > 0) {
      const firstSection = sections[0].substring(0, Math.floor(maxLength * 0.3));
      result += firstSection;
      remainingLength -= firstSection.length;
    }
    
    // Add middle sections if space allows
    const middleSections = sections.slice(1, -1);
    if (middleSections.length > 0 && remainingLength > 0) {
      const maxPerSection = Math.floor(remainingLength * 0.5 / middleSections.length);
      
      for (const section of middleSections) {
        if (remainingLength <= 0) break;
        
        const trimmedSection = section.substring(0, maxPerSection);
        result += '\n...\n' + trimmedSection;
        remainingLength -= trimmedSection.length + 5; // 5 for '\n...\n'
      }
    }
    
    // Add last section if space allows (usually conclusion)
    if (sections.length > 1 && remainingLength > 0) {
      const lastSection = sections[sections.length - 1].substring(0, remainingLength);
      result += '\n...\n' + lastSection;
    }
    
    return result;
  }

  /**
   * Save document content to a file
   * @param {object} document - Document object with content and metadata
   * @param {string} outputPath - Path to save the document
   * @returns {Promise<string>} - Path to the saved file
   */
  async saveToFile(document, outputPath) {
    try {
      const parsedUrl = new URL(document.url);
      const filename = path.basename(parsedUrl.pathname) || 'document';
      const outputFilePath = path.join(outputPath, `${filename}.txt`);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
      
      // Format the content with metadata
      let fileContent = `# ${document.title}\n\n`;
      fileContent += `URL: ${document.url}\n`;
      fileContent += `Date: ${new Date().toISOString()}\n\n`;
      fileContent += `## Content\n\n${document.content}\n`;
      
      fs.writeFileSync(outputFilePath, fileContent);
      return outputFilePath;
    } catch (error) {
      console.error('Error saving document to file:', error.message);
      throw error;
    }
  }

  // Chunking logic has been removed in favor of content compression and extraction
}

module.exports = DocumentFetcher;
