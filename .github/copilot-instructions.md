# Impersonaid Development Instructions

**Always reference these instructions first and fallback to additional search or bash commands only when you encounter unexpected information that does not match what is documented here.**

Impersonaid is a Node.js CLI tool and web application that helps evaluate documentation by simulating user interactions through LLM-powered personas. The application supports multiple LLM providers (OpenAI, Anthropic, Google Gemini, Ollama) and provides both command-line and web interfaces.

## Quick Setup and Validation

Bootstrap the repository with these exact commands:
```bash
npm install
npm link
cp config.toml.example config.toml
```

**Timing expectations**: All setup commands complete in under 1 second each. **NEVER CANCEL** these operations.

## Core Commands and Validation

### Basic CLI Operations
Run these commands to verify the application works:

```bash
# List available personas (< 1 second)
impersonaid list-personas

# List available LLM models (< 1 second) 
impersonaid list-models

# Create a test persona (< 1 second)
impersonaid create-sample --name test_persona

# View help
impersonaid --help
```

### Web Interface
Start the web server:
```bash
npm run web
# Server starts immediately and runs on http://localhost:3000
# You will see: "Impersonaid web server running on http://localhost:3000"
```

The web interface provides a complete UI for:
- Selecting document sources (URL or markdown)
- Choosing personas and LLM models  
- Interactive chat with simulated personas
- Real-time feedback and results

## API Key Requirements

**CRITICAL**: Most functionality requires API keys. Without them:
- CLI commands for listing and creating personas work
- Web interface loads but simulations fail
- Simulation commands show "API key not found" errors

### Configuration Setup
Edit `config.toml` to add API keys:
```toml
[api_keys]
openai = "your-openai-api-key"
anthropic = "your-anthropic-api-key" 
google = "your-google-api-key"
```

Alternatively, use environment variables:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## Validation Scenarios

**ALWAYS** run through these scenarios after making changes:

### 1. Basic CLI Validation
```bash
# Verify personas load correctly
impersonaid list-personas
# Should show: Beginner developer, Expert developer, Non-technical user

# Test persona creation
impersonaid create-sample --name validation_test
# Should create: personas/validation_test.yml
```

### 2. Web Interface Validation  
```bash
npm run web
# Navigate to http://localhost:3000
# Verify:
# - Page loads with "Impersonaid - Documentation Persona Simulator" title
# - Persona dropdown shows all available personas
# - Model dropdown shows: openai, anthropic, google, ollama options
# - Document source can toggle between URL and Markdown
# - Chat interface is present
```

### 3. Simulation Testing (Requires API Keys)
```bash
# Test with a working API key
impersonaid simulate \
  --persona "Expert developer" \
  --doc "https://github.com/theletterf/impersonaid" \
  --request "How do I get started?" \
  --model openai
```

**Expected behavior without API keys**: "OpenAI API key not found" error
**Expected behavior with API keys**: Creates output file in ./output/ directory

### 4. Ollama Local Testing
```bash
# Test Ollama connectivity (requires local Ollama server)
impersonaid simulate \
  --persona "Beginner developer" \
  --doc "README.md" \
  --request "What is this tool?" \
  --model ollama
```

**Expected behavior without Ollama**: "Error connecting to Ollama server"
**Expected behavior with Ollama running**: Successful simulation

## Project Structure

### Key Directories
- `src/`: Main application code
  - `cli.js`: Command-line interface
  - `web/`: Web server and UI components
  - `models/`: LLM provider integrations
  - `personas/`: Persona management
  - `utils/`: Document fetching and prompt building
- `personas/`: YAML persona definitions
- `output/`: Generated simulation results (created automatically)

### Important Files
- `package.json`: Dependencies and npm scripts
- `config.toml`: Configuration (copy from config.toml.example)
- `index.js`: Main entry point

## Common Development Tasks

### Adding New Personas
```bash
impersonaid create-sample --name new_persona_name
# Edit personas/new_persona_name.yml
# Verify with: impersonaid list-personas
```

### Testing Changes
1. **Always test CLI functionality first**: `impersonaid list-personas`
2. **Test web interface**: `npm run web` and verify in browser
3. **Validate persona loading**: Check dropdown lists are populated
4. **Test with sample data**: Use local files before external URLs

### No Testing Framework
**IMPORTANT**: This project has no automated test suite. Manual validation is required:
- Test both CLI and web interfaces after changes
- Verify error handling for missing API keys
- Check that personas load correctly
- Validate configuration file parsing

### No Linting Configuration  
The project has no ESLint, Prettier, or other code formatting tools configured. Maintain consistency with existing code style.

## Error Scenarios and Troubleshooting

### Common Issues
1. **"Persona not found"**: Use exact names from `impersonaid list-personas`
2. **"API key not found"**: Configure API keys in config.toml or environment variables
3. **"Ollama server not available"**: Install and start Ollama locally
4. **Web interface 404**: Some routes like `/personas` may not be implemented
5. **Output directory**: Created automatically when running simulations

### Dependencies
- **Node.js**: Requires >= 16.0.0 (specified in package.json)
- **External services**: LLM providers (OpenAI, Anthropic, Google) or local Ollama
- **Network access**: Required for fetching external documentation URLs

## Expected File Outputs

Successful operations create these files:
- **Persona creation**: `personas/[name].yml`
- **Simulation results**: `output/[timestamp]-[persona]-simulation.md` (requires API keys)
- **Configuration**: `config.toml` (copy from example)

Always verify these files are created as expected after running commands.

## Performance Expectations

- **npm install**: < 1 second (158 packages)
- **CLI commands**: < 1 second each
- **Web server startup**: < 1 second
- **LLM simulations**: Variable (depends on provider and network)
- **Document fetching**: Variable (depends on document size and network)

**NEVER CANCEL** any operation that appears to be working. The application is lightweight and operations complete quickly.