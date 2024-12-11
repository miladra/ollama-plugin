class OpenAIService {
    constructor() {
        this.apiUrl = 'http://localhost:11434/v1/chat/completions';
        this.ttsApiUrl = 'http://localhost:11434/v1/chat/completions';
    }

    async getAPIKey() {
        const { OPENAI_API_KEY } = await new Promise((resolve) => {
            chrome.storage.local.get('OPENAI_API_KEY', resolve);
        });

        if (!OPENAI_API_KEY) {
            throw new Error('API Key not set');
        }

        return OPENAI_API_KEY;
    }

    async callOpenAI(messages) {
        const apiKey = await this.getAPIKey();
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'aya:latest',
                messages: messages
            })
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    async getTextToSpeechDataUrl(text) {
        const apiKey = await this.getAPIKey();
        const response = await fetch(this.ttsApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: 'alloy',
                input: text
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error fetching text-to-speech audio');
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });

        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async translateText(text) {
        const messages = [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: `Rephrase following text to sound more natural to a native English speaker while maintaining its meaning accurately, do not explain what you did::\n\n"${text}"` }
           // { role: 'user', content: `Think about the following text and Explain it in simple English. Make sure you are accurate.:\n\n"${text}"` }
        ];
        const result = await this.callOpenAI(messages);
        return { translation: result || "Translation not available" };
    }

    async fetchExplanation(text) {
        const messages = [
            { role: 'system', content: 'You are a helpful assistant' },
            //{ role: 'user', content: `Think about the following text, make sure you understand it, then translate it to fluent Persian: \n\n"${text}".\n Do not explain` }
            //{ role: 'user', content: `Translate following text to Persian. Make sure you are accurate. Do not explain. the text is: \n\n"${text}"` }
            { role: 'user', content: `Translate following text to Persian while maintaining its meaning, do not explain what you did: The text is: \n\n"${text}"` }
        ];
        const result = await this.callOpenAI(messages);
        return { explanation: result || "Explanation not available" };
    }
}

export default new OpenAIService();
