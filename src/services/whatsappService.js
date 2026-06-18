const axios = require("axios");

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE;

// Headers padrão pra todas as requisições
const headers = {
  "Content-Type": "application/json",
  apikey: EVOLUTION_KEY,
};

// Envia uma mensagem de texto simples
async function enviarMensagem(telefone, mensagem) {
  try {
    const response = await axios.post(
      `${EVOLUTION_URL}/message/sendText/${INSTANCE}`,
      {
        number: telefone,
        text: mensagem,
      },
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.response?.data || error.message);
    throw error;
  }
}

// Envia uma mensagem com botões de resposta rápida
async function enviarMensagemComBotoes(telefone, mensagem, botoes) {
  try {
    const response = await axios.post(
      `${EVOLUTION_URL}/message/sendButtons/${INSTANCE}`,
      {
        number: telefone,
        title: mensagem,
        buttons: botoes.map((b, i) => ({
          buttonId: `btn_${i}`,
          buttonText: { displayText: b },
          type: 1,
        })),
      },
      { headers }
    );

    return response.data;
  } catch (error) {
    // Se botões não funcionarem, manda como texto normal
    console.warn("Botões não suportados, enviando como texto");
    const textoComOpcoes =
      mensagem + "\n\n" + botoes.map((b, i) => `${i + 1}. ${b}`).join("\n");
    return enviarMensagem(telefone, textoComOpcoes);
  }
}

// Extrai o telefone e o texto de um webhook recebido da Evolution API
function extrairDadosWebhook(body) {
  try {
    // Estrutura padrão da Evolution API v2
    const dados = body.data || body;
    
    const telefone = dados.key?.remoteJid?.replace("@s.whatsapp.net", "");
    const mensagem =
      dados.message?.conversation ||
      dados.message?.extendedTextMessage?.text ||
      dados.message?.imageMessage?.caption ||
      "";
    const tipo = dados.messageType || "text";
    const fromMe = dados.key?.fromMe || false;

    return { telefone, mensagem, tipo, fromMe };
  } catch (error) {
    console.error("Erro ao extrair dados do webhook:", error);
    return null;
  }
}

module.exports = { enviarMensagem, enviarMensagemComBotoes, extrairDadosWebhook };
