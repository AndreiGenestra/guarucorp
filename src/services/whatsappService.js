const axios = require("axios");

// ===========================================================
// META CLOUD API (WhatsApp Business Platform - API Oficial)
// ===========================================================
// Documentação oficial:
// https://developers.facebook.com/docs/whatsapp/cloud-api
//
// Por que migramos da Evolution API:
// O WhatsApp passou a entregar conexões não-oficiais (Baileys/Evolution)
// um identificador criptografado (@lid) em vez do número de telefone real,
// como medida de privacidade/anti-automação. Não existe forma confiável de
// reverter esse @lid para um número de telefone utilizável — a Meta Cloud
// API (oficial) não tem essa barreira, pois você é um remetente autorizado.

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = process.env.META_API_VERSION || "v21.0";

const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

// Envia uma mensagem de texto simples
async function enviarMensagem(telefone, mensagem) {
  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefone,
        type: "text",
        text: { body: mensagem, preview_url: false },
      },
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.response?.data || error.message);
    throw error; // Mantemos o throw para o controller capturar no catch
  }
}

// Envia uma mensagem com botões de resposta rápida (até 3 botões)
async function enviarMensagemComBotoes(telefone, mensagem, botoes) {
  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefone,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: mensagem },
          action: {
            buttons: botoes.slice(0, 3).map((b, i) => ({
              type: "reply",
              reply: { id: `btn_${i}`, title: b.slice(0, 20) }, // título máx 20 caracteres
            })),
          },
        },
      },
      { headers }
    );

    return response.data;
  } catch (error) {
    console.warn("Erro ao enviar botões, enviando como texto:", error.response?.data || error.message);
    const textoComOpcoes =
      mensagem + "\n\n" + botoes.map((b, i) => `${i + 1}. ${b}`).join("\n");
    return enviarMensagem(telefone, textoComOpcoes);
  }
}

// Marca uma mensagem recebida como "lida" (opcional, mas dá uma boa experiência)
async function marcarComoLida(messageId) {
  try {
    await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      { headers }
    );
  } catch (error) {
    console.warn("Erro ao marcar como lida:", error.response?.data || error.message);
  }
}

// Extrai os dados relevantes do payload de webhook da Meta Cloud API
// Estrutura oficial: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
//
// IMPORTANTE: aqui o "from" já vem como número de telefone real (ex: "5511999999999"),
// nunca como @lid — esse problema simplesmente não existe na API oficial.
function extrairDadosWebhook(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Pode ser uma notificação de status (enviado/entregue/lido) em vez de mensagem nova
    if (!value?.messages) {
      return null;
    }

    const mensagemObj = value.messages[0];
    const contato = value.contacts?.[0];

    const telefone = mensagemObj.from; // número real, sem prefixo/sufixo, sem @lid
    const messageId = mensagemObj.id;
    const tipo = mensagemObj.type;

    let mensagem = "";
    if (tipo === "text") {
      mensagem = mensagemObj.text.body;
    } else if (tipo === "button") {
      mensagem = mensagemObj.button.text;
    } else if (tipo === "interactive") {
      mensagem =
        mensagemObj.interactive?.button_reply?.title ||
        mensagemObj.interactive?.list_reply?.title ||
        "";
    } else if (tipo === "image") {
      mensagem = mensagemObj.image?.caption || "[Imagem enviada]";
    } else if (tipo === "audio") {
      mensagem = "[Áudio enviado]";
    } else {
      mensagem = `[Mensagem do tipo ${tipo} não suportada]`;
    }

    const nomeContato = contato?.profile?.name || null;

    return {
      telefone,
      mensagem,
      tipo,
      messageId,
      nomeContato,
      fromMe: false, // a Meta Cloud API só envia webhooks de mensagens recebidas, nunca enviadas pelo bot
    };
  } catch (error) {
    console.error("Erro ao extrair dados do webhook:", error);
    return null;
  }
}

module.exports = {
  enviarMensagem,
  enviarMensagemComBotoes,
  marcarComoLida,
  extrairDadosWebhook,
};
