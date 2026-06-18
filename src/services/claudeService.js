const { GoogleGenAI } = require('@google/genai');

// Inicializa a API buscando a chave do seu arquivo .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const gerarResposta = async (numeroCliente, textoRecebido) => {
    try {
        // Aqui você pode criar a personalidade do seu bot (System Instructions)
        const instrucoesDoSistema = `
            Você é um assistente virtual prestativo e educado para o WhatsApp da empresa Guarucorp.
            Responda de forma direta, clara e amigável. Use emojis moderadamente.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: textoRecebido,
            config: {
                systemInstruction: instrucoesDoSistema,
                // Controla a criatividade (0.7 é excelente para conversas gerais)
                temperature: 0.7, 
            }
        });

        // Retorna o texto gerado pelo Gemini
        return response.text;

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        return "Desculpe, tive um probleminha técnico aqui. Pode repetir, por favor?";
    }
};

module.exports = {
    gerarResposta
};