import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Conversation {
    _id: string;
    title: string;
    agent_type: string;
    updated_at: string;
    created_at: string;
}

interface ChatState {
    conversations: Conversation[];
    activeId: string | undefined;
    isLoading: boolean;
    error: string | null;

    // Actions
    setActiveId: (id: string | undefined) => void;
    fetchConversations: () => Promise<void>;
    renameConversation: (id: string, newTitle: string) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    addOrUpdateConversation: (conv: Conversation) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeId: undefined,
    isLoading: false,
    error: null,

    setActiveId: (id) => set({ activeId: id }),

    fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.listConversations(1, 50);
            set({ conversations: result.conversations || [], isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            console.error('Failed to load conversations:', err);
        }
    },

    renameConversation: async (id, newTitle) => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;

        // Optimistic update
        const previous = get().conversations;
        set({
            conversations: previous.map((c) =>
                c._id === id ? { ...c, title: trimmed } : c
            ),
        });

        try {
            await api.updateConversation(id, trimmed);
        } catch (err) {
            console.error('Failed to rename conversation:', err);
            // Revert optimistic update
            set({ conversations: previous });
        }
    },

    deleteConversation: async (id) => {
        const { activeId, conversations } = get();
        
        // Optimistic update
        const previous = conversations;
        set({ conversations: previous.filter((c) => c._id !== id) });
        
        // Reset active session if we deleted it
        if (activeId === id) set({ activeId: undefined });

        try {
            await api.deleteConversation(id);
        } catch (err) {
            console.error('Failed to delete conversation:', err);
            // Revert
            set({ conversations: previous });
            if (activeId === id) set({ activeId });
        }
    },

    addOrUpdateConversation: (conv) => {
        const { conversations } = get();
        const exists = conversations.find(c => c._id === conv._id);
        
        if (exists) {
            set({
                conversations: conversations.map(c => c._id === conv._id ? conv : c).sort(
                    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                )
            });
        } else {
            set({
                conversations: [conv, ...conversations].sort(
                    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                )
            });
        }
    }
}));
