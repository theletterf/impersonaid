# Impersonaid

Impersonaid helps you evaluate your documentation against LLM-powered user personas to simulate real user interactions and gather feedback, as if it was a UX research session. Of course, it's not real substitute for proper user research, but it can be a useful tool for quick iterations and getting initial insights.

Note that I created Impersonaid using Windsurf and Claude 3.7. This is an experimental tool.

## Overview

Impersonaid is a tool that helps documentation writers, UX researchers, and product teams evaluate documentation from different user perspectives. By defining user personas with varying levels of expertise, backgrounds, and preferences, you can simulate how different users would interact with your documentation.

<img width="1487" alt="Screenshot 2025-06-14 at 23 34 24" src="https://github.com/user-attachments/assets/6c168c99-45d5-491b-9e9b-205616b648fe" />

## Installation

```bash
# Clone the repository
git clone https://github.com/theletterf/impersonaid.git
cd llm-docs-persona-simulator

# Install dependencies
npm install

# Make the CLI executable
npm link
```

## Configuration

1. Copy the example configuration file:

```bash
cp config.toml.example config.toml
```

2. Edit the `config.toml` file to add your API keys and customize settings:

```toml
[api_keys]
openai = "your-openai-api-key" # OpenAI API key
anthropic = "your-anthropic-api-key" # Anthropic API key for Claude
google = "your-google-api-key" # Google API key for Gemini
openrouter = "your-openrouter-api-key" # OpenRouter API key

# Additional configuration options...
```

Alternatively, you can set the API keys as environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

### OpenRouter Setup

OpenRouter provides access to multiple LLM providers through a single API. To use OpenRouter:

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get your API key from the dashboard
3. Set it in your config.toml or as an environment variable
4. Use any of the supported model names like `openai/gpt-4o`, `anthropic/claude-3-opus`, `google/gemini-pro`, etc.

OpenRouter allows you to access models from different providers using a single API key, which can be more convenient than managing multiple API keys.

## Usage

Impersonaid can be used either through the command line interface or the web interface.

### Creating personas

Create a sample persona to get started:

```bash
impersonaid create-sample --name expert_developer
```

This will create a YAML file in the `personas` directory that you can customize.

### Listing available personas

```bash
impersonaid list-personas
```

### Running a simulation

Test documentation against a persona:

```bash
impersonaid simulate \
  --persona beginner_developer \
  --doc "https://example.com/docs/getting-started" \
  --request "What are the first steps to install this product?" \
  --model openrouter
```

### Interactive mode

Run an interactive session with a persona:

```bash
impersonaid simulate \
  --persona beginner_developer \
  --doc "https://example.com/docs/getting-started" \
  --request "Help me understand this documentation" \
  --model claude \
  --interactive
```

### Listing available models

```bash
impersonaid list-models
```

### Web interface

Impersonaid also provides a web interface for a more interactive experience:

```bash
impersonaid web
# or
npm run web
```

This starts a local web server at http://localhost:3000 where you can:

- Input documentation via URL or paste markdown content directly
- Select from available personas
- Choose your preferred LLM provider
- Chat with the simulated persona in a user-friendly interface
- See responses in a chat-like conversation view

### Model-specific limitations

Different LLM providers have varying capabilities when it comes to processing documentation:

- **Claude**: Supports direct URL analysis through prompt engineering. Claude can analyze the content of URLs provided in the prompt.

- **Gemini**: Supports direct URL analysis through its function calling capabilities. Gemini can browse and analyze web content directly.

- **OpenRouter**: Does not support direct web browsing. For OpenRouter models, the simulator fetches the document content, extracts important sections, compresses it, and includes it in the prompt similar to OpenAI.

- **OpenAI**: Does not support direct web browsing. For OpenAI models, the simulator automatically fetches the document content, extracts important sections, compresses it, and includes it in the prompt.

- **Ollama**: Does not support direct web browsing. For local models through Ollama, the simulator fetches the document content, extracts important sections, and compresses it for efficient processing.

## Persona definition

Personas are defined in YAML files with the following structure:

```yaml
name: beginner_developer
description: A junior developer who is new to programming and the technology stack.
expertise:
  technical: Beginner
  domain: Limited
  tools: Basic understanding of development tools
background:
  education: Computer Science student or bootcamp graduate
  experience: Less than 1 year of professional experience
traits:
  patience: Low
  attention_to_detail: Moderate
  learning_style: Prefers step-by-step tutorials with examples
goals:
  - Understand basic concepts quickly
  - Find practical examples to learn from
  - Avoid complex technical jargon
preferences:
  documentation_style: Visual with clear examples
  communication: Simple and direct explanations
```

## Output

By default, simulation results are saved as Markdown files in the `output` directory. The files include:

- Persona details
- Documentation URL and title
- User request
- Simulated response

## License

This project is licensed under the terms of the license included in the repository.
