const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UserPreferences {
    preferred_language: string;
    academic_level: string;
    course: string;
    syllabus_topics: string[];
    learning_goals: string[];
    response_style: string;
}

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    getToken() {
        return this.token;
    }

    clearToken() {
        this.token = null;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
            cache: 'no-store',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || error.message || 'Request failed');
        }

        return response.json();
    }

    // ============ Auth ============

    async register(name: string, email: string, password: string, preferences?: Partial<UserPreferences>) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                password,
                preferences: {
                    preferred_language: 'en',
                    academic_level: '',
                    course: '',
                    syllabus_topics: [],
                    learning_goals: [],
                    response_style: 'balanced',
                    ...(preferences || {}),
                },
            }),
        });
        this.setToken(data.access_token);
        return data;
    }

    async login(email: string, password: string) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.access_token);
        return data;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async updatePreferences(preferences: Partial<UserPreferences>) {
        return this.request('/auth/me/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences),
        });
    }

    async logout() {
        this.clearToken();
        return this.request('/auth/logout', { method: 'POST' });
    }

    // ============ Conversations ============

    async listConversations(page: number = 1, limit: number = 30) {
        return this.request(`/conversations?page=${page}&limit=${limit}`);
    }

    async getConversation(id: string) {
        return this.request(`/conversations/${id}`);
    }

    async createConversation(title?: string) {
        return this.request('/conversations', {
            method: 'POST',
            body: JSON.stringify({ title: title || 'New Chat' }),
        });
    }

    async updateConversation(id: string, title: string) {
        return this.request(`/conversations/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        });
    }

    async deleteConversation(id: string) {
        return this.request(`/conversations/${id}`, {
            method: 'DELETE',
        });
    }

    // ============ Chat (SSE Streaming) ============

    async chatStream(
        message: string,
        conversationId?: string,
        files?: string[],
        language: string = 'en',
        voice: boolean = false,
        responseVoice: boolean = false,
        onEvent?: (event: { type: string; [key: string]: any }) => void,
    ): Promise<void> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                message,
                conversation_id: conversationId || null,
                files: files || null,
                language,
                voice,
                response_voice: responseVoice,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Chat request failed' }));
            throw new Error(error.detail || 'Chat request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        onEvent?.(data);
                    } catch {
                        // skip malformed JSON
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.startsWith('data: ')) {
            try {
                const data = JSON.parse(buffer.slice(6));
                onEvent?.(data);
            } catch {
                // skip
            }
        }
    }

    // ============ Files ============

    async uploadFile(file: File) {
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json();
    }

    async transcribeAudio(file: File, language?: string) {
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (language) {
            formData.append('language', language);
        }

        const response = await fetch(`${API_URL}/api/files/transcribe`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Transcription failed' }));
            throw new Error(error.detail || 'Transcription failed');
        }

        return response.json();
    }

    getFileUrl(fileId: string) {
        return `${API_URL}/api/files/${fileId}`;
    }

    getUploadUrl(path: string) {
        return `${API_URL}${path}`;
    }
}

export const api = new ApiClient();
