export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
  createdAt: Date;
}
