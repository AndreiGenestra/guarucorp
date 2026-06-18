const Anthropic = require("@anthropic-ai/sdk");
const { calcularOrcamento } = require("../../config/precos");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompt base que define a personalidade e regras do bot
function gerarSystemPrompt() {
  return `Você é um assistente virtual do ${process.env.TECNICO_NOME}, técnico especialista em ar-condicionado e climatização com anos de experiência.

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
- Se o cliente insistir em uma solução técnica grátis, explique educadamente que o ${process.env.TECNICO_NOME} cobra pela consulta justamente para garantir qualidade no atendimento.
- Se o problema parecer urgente ou perigoso (cheiro de queimado, faísca, etc.), oriente o cliente a desligar o equipamento da tomada imediatamente.
- Sempre use linguagem clara e simples, sem termos técnicos complicados.

## INFORMAÇÕES DE PAGAMENTO

Chave Pix: ${process.env.TECNICO_PIX}
Titular: ${process.env.TECNICO_NOME}

## HORÁRIOS DISPONÍVEIS

Segunda a sexta: ${process.env.HORARIO_INICIO} às ${process.env.HORARIO_FIM}
Duração de cada consulta: ${process.env.DURACAO_CONSULTA_MINUTOS} minutos

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

// Envia o histórico da conversa pro Claude e retorna a resposta
async function processarMensagem(historico, mensagemNova) {
  // Monta as mensagens no formato que o Claude espera
  const messages = [
    ...historico.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: "user",
      content: mensagemNova,
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: gerarSystemPrompt(),
    messages,
  });

  const textoCompleto = response.content[0].text;

  // Extrai o JSON de dados coletados se existir
  const dadosColetados = extrairDadosColeta(textoCompleto);

  // Remove o bloco de dados da mensagem que vai pro cliente
  const mensagemLimpa = textoCompleto
    .replace(/\[DADOS_COLETA\][\s\S]*?\[\/DADOS_COLETA\]/g, "")
    .trim();

  return {
    mensagem: mensagemLimpa,
    dadosColetados,
  };
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

module.exports = { processarMensagem };
