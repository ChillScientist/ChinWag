import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SYSTEM_PROMPT, type PromptTemplate } from '@/constants/systemPrompts';

interface SystemPromptState {
  templates: PromptTemplate[];
  addTemplate: (name: string, content: string) => void;
  deleteTemplate: (id: string) => void;
}

const createDefaultTemplate = (): PromptTemplate => ({
  id: 'default-system-prompt',
  name: 'Helpful Assistant',
  content: DEFAULT_SYSTEM_PROMPT,
  isDefault: true,
  createdAt: new Date(),
});

export const useSystemPromptStore = create<SystemPromptState>()(
  persist(
    (set, get) => ({
      templates: [createDefaultTemplate()],
      addTemplate: (name: string, content: string) => {
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        const trimmedName = name.trim() || `Template ${get().templates.length + 1}`;
        const newTemplate: PromptTemplate = {
          id: uuidv4(),
          name: trimmedName,
          content: trimmedContent,
          createdAt: new Date(),
        };

        set(state => ({ templates: [newTemplate, ...state.templates] }));
      },
      deleteTemplate: (id: string) => {
        const template = get().templates.find(t => t.id === id);
        if (template?.isDefault) {
          return; // Never delete the default template
        }
        set(state => ({ templates: state.templates.filter(template => template.id !== id) }));
      },
    }),
    {
      name: 'system-prompt-templates',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const normalizedTemplates = state.templates?.map(template => ({
          ...template,
          createdAt: new Date(template.createdAt),
        })) ?? [];

        const hasDefaultTemplate = normalizedTemplates.some(template => template.isDefault);

        state.templates = hasDefaultTemplate
          ? normalizedTemplates
          : [...normalizedTemplates, createDefaultTemplate()];
      },
    }
  )
);

export default useSystemPromptStore;
