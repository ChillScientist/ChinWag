# ChinWag
A minimal React UI for Ollama - chat with local LLMs using a clean, modern interface. Built with Vite, Tailwind CSS, and shadcn/ui components.

Features:
- Chat interface with streaming responses
- Multiple chat sessions with search and filtering
- Model selection and parameter tuning
- Automatic conversation naming and tagging
- System prompt customization
- Markdown support with code highlighting

## Getting Started
### Prerequisites

- Install Ollama
- Install Node.js (latest LTS version)

### Setup
#### Clone the repository
```
git clone https://github.com/[your-username]/chinwag.git
```
#### Navigate to project directory
```
cd chinwag
```
#### Install dependencies
```
npm install
```
#### Start the development server
```
npm run dev
```
### Configuration
Ensure Ollama is running locally on port 11434 (default port)
Pull at least one model in Ollama before starting:
```
ollama pull llama2
```