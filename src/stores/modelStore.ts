import { create } from 'zustand';
import ollama from 'ollama';

// Model interface - can be shared or defined per store if variations exist
// For now, keep it simple. If ChatSession's Model type from components/types needs more detail, align them.
interface Model {
  name: string;
  // Ollama's ListResponse actually has more fields like:
  // modified_at: string;
  // size: number;
  // digest: string;
  // details: { /* ... */ };
  // Consider adding these if they become useful for display or logic.
}

interface ModelStoreState {
  models: Model[];
  isLoadingModels: boolean;
  fetchModels: () => Promise<void>;
  // Potential future additions: error state for fetching models
  // selectedModelForNewSession: string | null; // if we want more complex default model logic
}

export const useModelStore = create<ModelStoreState>()((set, get) => ({
  models: [],
  isLoadingModels: false, // Start with false, set to true only during fetch

  fetchModels: async () => {
    if (get().isLoadingModels) return; // Prevent concurrent fetches
    set({ isLoadingModels: true });
    try {
      const response = await ollama.list();
      // Assuming response.models is an array of objects matching our simplified Model interface
      // Or, if using more detailed types from ollama library:
      // const fetchedModels: Model[] = response.models.map(m => ({ name: m.name, ...other relevant fields }));
      const fetchedModels = response.models as Model[]; // Cast for now
      set({ models: fetchedModels, isLoadingModels: false });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({ isLoadingModels: false /*, models: [] // Optionally clear models on error */ });
      // Optionally, set an error message in the store
    }
  },
}));

// Automatically fetch models when the store is initialized (client-side)
// This ensures models are loaded as soon as possible.
if (typeof window !== 'undefined') {
  useModelStore.getState().fetchModels();
}

export default useModelStore;
