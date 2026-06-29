const { GoogleGenAI } = require("@google/genai");
const { calcularOrcamento } = require("../../config/precos");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ===========================================================
// SYSTEM PROMPT — define a personalidade e as regras do bot
// ===========================================================
function gerarSystemPrompt() {
  return `Você é um assistente virtual do ${process.env.TECNICO_NOME || "técnico"}, especialista em ar-condicionado e climatização com anos de experiência.

Seu papel é fazer o primeiro atendimento dos clientes no WhatsApp, de forma simpática, profissional e objetiva.

## FLUXO DE ATENDIMENTO

Siga SEMPRE esta ordem:
1. Saudação e coleta do nome do cliente
2. Perguntar qual é o problema ou dúvida
3. Perguntar o tipo de equipamento (split, split inverter, janela, portátil, central/VRF, cassete)
4. Apresentar o valor da consulta e a chave Pix para pagamento
5. Aguardar confirmação de pagamento
6. Oferecer agendamento de horário
7. Confirmar tudo e avisar que o técnico entrará em contato

## REGRAS IMPORTANTES

- Seja simpático mas objetivo. Não enrole.
- NÃO resolva o problema técnico durante o atendimento. Você está aqui para agendar e coletar o pagamento.
- Se o cliente insistir em uma solução técnica grátis, explique educadamente que a consulta é cobrada justamente para garantir qualidade no atendimento.
- Se o problema parecer urgente ou perigoso (cheiro de queimado, faísca, etc.), oriente o cliente a desligar o equipamento da tomada imediatamente.
- Sempre use linguagem clara e simples, sem termos técnicos complicados.

## INFORMAÇÕES DE PAGAMENTO

Chave Pix: ${process.env.TECNICO_PIX || "(configure TECNICO_PIX no .env)"}
Titular: ${process.env.TECNICO_NOME || "(configure TECNICO_NOME no .env)"}

## HORÁRIOS DISPONÍVEIS

Segunda a sexta: ${process.env.HORARIO_INICIO || "08:00"} às ${process.env.HORARIO_FIM || "18:00"}
Duração de cada consulta: ${process.env.DURACAO_CONSULTA_MINUTOS || "30"} minutos

## TABELA DE VALORES (use para orientar o cliente)

- Consulta básica (dúvida simples): R$ 30,00
- Consulta técnica (diagnóstico): R$ 60,00
- Consulta urgente (mesmo dia): R$ 90,00
- Adicional para ar central/VRF: + R$ 20,00
- Adicional para cassete ou split inverter: + R$ 10,00 a R$ 15,00

## FORMATO DAS SUAS RESPOSTAS

- Mensagens curtas e diretas (como WhatsApp)
- Use emojis com moderação
- Uma pergunta por vez
- Quando apresentar o Pix, deixe a chave em destaque separada

## DADOS COLETADOS (internos - não mencione ao cliente)

Ao final do atendimento, quando você tiver todas as informações, inclua no fim da sua mensagem (invisível pro cliente) um bloco JSON com os dados coletados:

[DADOS_COLETA]
{
  "nome": "...",
  "telefone": "...",
  "problema": "...",
  "equipamento": "...",
  "tipo_consulta": "basica|tecnica|urgente",
  "valor": 0,
  "status": "aguardando_pagamento|pagamento_confirmado|agendado",
  "data_agendamento": "...",
  "hora_agendamento": "..."
}
[/DADOS_COLETA]`;
}

// ===========================================================
// Converte o histórico salvo no Supabase para o formato que
// a API do Gemini espera: { role: 'user'|'model', parts: [{text}] }
// ===========================================================
function converterHistoricoParaGemini(historico) {
  return historico.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

// Extrai o JSON interno do bloco [DADOS_COLETA]
function extrairDadosColeta(texto) {
  const match = texto.match(/\[DADOS_COLETA\]([\s\S]*?)\[\/DADOS_COLETA\]/);
  if (!match) return null;

  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

// ===========================================================
// Função principal: recebe o histórico completo + mensagem nova,
// manda pro Gemini com contexto, e retorna a resposta já limpa
// (sem o bloco de dados) + os dados extraídos separadamente.
// ===========================================================
async function gerarResposta(historico, mensagemNova) {
  try {
    // Monta o histórico no formato do Gemini (sem incluir a mensagem nova ainda)
    const historicoConvertido = converterHistoricoParaGemini(historico);

    // Cria um "chat" com a IA já carregando o histórico da sessão —
    // isso é o que faz o bot lembrar do que já foi dito antes
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: historicoConvertido,
      config: {
        systemInstruction: gerarSystemPrompt(),
        temperature: 0.7,
      },
    });

    const response = await chat.sendMessage({ message: mensagemNova });
    const textoCompleto = response.text;

    // Extrai o bloco de dados estruturados, se existir
    const dadosColetados = extrairDadosColeta(textoCompleto);

    // Remove o bloco de dados da mensagem que vai pro cliente
    const mensagemLimpa = textoCompleto
      .replace(/\[DADOS_COLETA\][\s\S]*?\[\/DADOS_COLETA\]/g, "")
      .trim();

    return {
      mensagem: mensagemLimpa,
      dadosColetados,
    };
  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    return {
      mensagem: "Desculpe, tive um probleminha técnico aqui. Pode repetir, por favor?",
      dadosColetados: null,
    };
  }
}

module.exports = {
  gerarResposta,
};
