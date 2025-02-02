# ChinWag
A minimal React UI for Ollama - chat with local LLMs using a clean, modern interface. Built with Vite, Tailwind CSS, and shadcn/ui components.

Features:
- Chat interface with streaming responses
- Multiple chat sessions with search and filtering
- Model selection and parameter tuning
- Automatic conversation naming and tagging
- System prompt customization
- Markdown support with code highlighting
- Bookmarks and favorites support

## Getting Started
### Prerequisites
- Install Ollama
- Install Node.js (latest LTS version)
### Setup
#### Clone the repository
```
git clone https://github.com/ChillScientist/ChinWag.git
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
## Features
### Basic Features
- From a listbox, the user can select an installed Ollama model
- In a text box, the user can type their prompt and press Enter key or press Send button
- The text box supports multiple lines of text. Pressing Shift+Enter adds a new line
- The text is sent to Ollama using the model selected and the user message entered
- The assistant message response is displayed in a text box
- The new user prompt text box is selected so the user can starting typing after the assistant message is generated
### System Prompt
- The user can enter a system prompt into a text box
### Streaming
- Support Ollama `stream: true`
- Text is displayed as it streams from Ollama
### Delete Messages
- The user can delete any user or assistant message by pressing a Delete icon/button next to the message
- All other messages are retained
### Edit Messages
- The user can edit any user or assistant message
### Regenerate Messages
- The user can press a Regen(erate) button to regenerate the most recent assistant message response
- The user can press Ctrl+Space to regenerate the most recent assistant message response
### Scroll to Bottom
- The window scrolls to show new assistant text as it streams in
### Chat Session History
- The user can create multiple chat sessions
- The user can press a New Chat button create a new session
- The user can rename the chat session. Defaults to "New Chat". Editing the name is "inline" (not modal dialog box).
- The user can delete a chat session
- The user can switch between chat sessions
### Chat Session Persistence
- Chat session history is retained across instances of running the application.
### Resizable Session SideBar
- The user can collapse/expand the Session Bar
- The user can resize the expanded Session Bar size
### Settings SideBar
- The user can select the model, set the prompt, and other supported settings from a sidebar
- The settings are per-session
- The settings are persisted with the session data
### Stop Assistant Message generation
- The user can stop an assistant message that's being generated before it finishes
### Tags and Notes
- The user can add tags to a session
- The user can add notes to a session
- The user can have the LLM generate tags or notes based on the conversation
### Markdown support
- Support Markdown in the Assistant message (most modern LLM's default to outputting formatted text in Markdown)
### Search
- User can filter the list of sessions in the Sessions Sidebar based on search criteria
- Case insensitive, partial word matching
- Search is real-time
- Search is weighted (name, tags, notes, message content)
- Supports operators (system:, name:, tag:, nope:, in:)
### Bookmarks and Favorites
- The user can bookmark a session for quick access to in-progress or reference conversations
- The user can favorite a session to mark it as particularly valuable or frequently accessed
- The user can filter sessions by bookmarked or favorited status
- The user can use search operators (type:bookmarked, type:favorite) to find marked sessions