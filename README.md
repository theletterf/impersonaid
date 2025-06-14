# llm-docs-persona-simulator
# LLM Docs Persona Simulator

Test your documentation against LLM-powered user personas to simulate real user interactions and gather feedback as if it was a UX research session.

## Overview

The LLM Docs Persona Simulator is a tool that helps documentation writers, UX researchers, and product teams evaluate documentation from different user perspectives. By defining user personas with varying levels of expertise, backgrounds, and preferences, you can simulate how different users would interact with your documentation.

### Key features

- Define custom user personas with detailed attributes
- Test documentation against these personas using powerful LLMs
- Support for multiple LLM providers (OpenAI, Anthropic Claude, Google Gemini)
- Local model support via Ollama
- Interactive or file-based output modes
- Simple command-line interface

## Installation

```bash
# Clone the repository
git clone https://github.com/theletterf/llm-docs-persona-simulator.git
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
# API keys for different LLM providers
# These will be loaded from environment variables if not specified here
openai = "your-openai-api-key" # OpenAI API key
anthropic = "your-anthropic-api-key" # Anthropic API key for Claude
google = "your-google-api-key" # Google API key for Gemini

# Additional configuration options...
```

Alternatively, you can set the API keys as environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## Usage

### Creating personas

Create a sample persona to get started:

```bash
llm-docs-persona-simulator create-sample --name expert_developer
```

This will create a YAML file in the `personas` directory that you can customize.

### Listing available personas

```bash
llm-docs-persona-simulator list-personas
```

### Running a simulation

Test documentation against a persona:

```bash
llm-docs-persona-simulator simulate \
  --persona beginner_developer \
  --doc "https://example.com/docs/getting-started" \
  --request "What are the first steps to install this product?" \
  --model openai
```

### Interactive mode

Run an interactive session with a persona:

```bash
llm-docs-persona-simulator simulate \
  --persona beginner_developer \
  --doc "https://example.com/docs/getting-started" \
  --request "Help me understand this documentation" \
  --model claude \
  --interactive
```

### Listing available models

```bash
llm-docs-persona-simulator list-models
```

### Model-specific limitations

Different LLM providers have varying capabilities when it comes to processing documentation:

- **Claude**: Supports direct URL analysis through prompt engineering. Claude can analyze the content of URLs provided in the prompt.

- **Gemini**: Supports direct URL analysis through its function calling capabilities. Gemini can browse and analyze web content directly.

- **OpenAI**: Does not support direct web browsing. For OpenAI models, the simulator automatically fetches the document content, compresses it, and includes it in the prompt. This approach avoids chunking but may be limited by token constraints for very large documents.

- **Ollama**: Does not support direct web browsing. For local models through Ollama, the simulator fetches the document content and processes it in chunks if necessary.

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
