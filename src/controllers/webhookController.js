const { extrairDadosWebhook, enviarMensagem, marcarComoLida } = require("../services/whatsappService");
const { gerarResposta } = require("../services/claudeService"); // Gemini
const {
  buscarSessao,
  criarSessao,
  adicionarMensagem,
  atualizarSessao,
} = require("../services/sessaoService");
const { criarAgendamento } = require("../services/agendaService");
const supabase = require("../../config/database");

async function receberWebhook(req, res) {
  // Responde imediatamente — a Meta exige resposta em até 20s ou reenvia o webhook
  res.status(200).json({ status: "ok" });

  console.log("\n📥 [LISTENING] Nova requisição recebida na rota /webhook");

  try {
    const dados = extrairDadosWebhook(req.body);

    // Retorna null se for notificação de status (enviado/entregue/lido), não mensagem nova
    if (!dados || dados.fromMe || !dados.mensagem) {
      console.log("ℹ️ Evento ignorado (sem mensagem de texto, ou notificação de status)");
      return;
    }

    const { telefone, mensagem, messageId, nomeContato } = dados;

    // NOTA: na Meta Cloud API, "telefone" já vem como número de telefone puro
    // (ex: "5511999999999"), sem @lid e sem qualquer sufixo. Não precisa de
    // nenhum tratamento extra aqui — o remendo do @lid que existia antes foi
    // removido porque a causa raiz (conexão não-oficial) não existe mais.

    console.log(`📩 Mensagem recebida de ${telefone} (${nomeContato || "sem nome"}): "${mensagem}"`);

    // Marca como lida (boa prática, não bloqueia o fluxo se falhar)
    if (messageId) marcarComoLida(messageId).catch(() => {});

    // Busca ou cria sessão do cliente
    let sessao = await buscarSessao(telefone);
    if (!sessao) {
      sessao = await criarSessao(telefone);
      console.log(`🆕 Nova sessão criada para ${telefone}`);
    }

    // Adiciona a mensagem do usuário ao histórico
    await adicionarMensagem(sessao.id, "user", mensagem);

    // Chama a IA (Gemini) passando o histórico completo + mensagem nova
    console.log("🤖 Chamando a API da Inteligência Artificial...");
    const { mensagem: resposta, dadosColetados } = await gerarResposta(sessao.historico, mensagem);
    console.log(`✨ [LISTENING] Resposta gerada pela IA: "${resposta}"`);

    // Adiciona a resposta do bot ao histórico
    await adicionarMensagem(sessao.id, "assistant", resposta);

    // Se a IA coletou dados estruturados (nome, problema, agendamento, etc.), salva no banco
    if (dadosColetados) {
      await processarDadosColetados(sessao, dadosColetados, telefone, nomeContato);
    }

    // Envia a resposta pro WhatsApp do cliente
    console.log(`🚀 [LISTENING] Enviando para o whatsappService -> Telefone: ${telefone}`);
    await enviarMensagem(telefone, resposta);

    console.log(`✅ Resposta enviada com sucesso para ${telefone}`);
  } catch (error) {
    console.error("❌ Erro detectado no fluxo principal do webhook:");

    if (error.response) {
      console.error("📋 [LISTENING ERRO META API]:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }

    // Tenta enviar mensagem de erro pro cliente
    try {
      const dados = extrairDadosWebhook(req.body);
      if (dados?.telefone) {
        await enviarMensagem(
          dados.telefone,
          "Desculpe, tive um probleminha técnico. Pode me mandar a mensagem novamente? 🙏"
        );
      }
    } catch (errEnvio) {
      console.error("Erro ao tentar enviar aviso de erro para o cliente:", errEnvio.message);
    }
  }
}

// Salva os dados coletados no banco
async function processarDadosColetados(sessao, dados, telefone, nomeContato) {
  try {
    // Usa o nome do WhatsApp como fallback se a IA ainda não coletou o nome
    await upsertCliente({
      telefone,
      nome: dados.nome || nomeContato,
    });

    await atualizarSessao(sessao.id, {
      status: dados.status,
      dados_atendimento: dados,
    });

    if (
      dados.status === "agendado" &&
      dados.data_agendamento &&
      dados.hora_agendamento
    ) {
      await criarAgendamento({
        telefone,
        nome: dados.nome || nomeContato,
        problema: dados.problema,
        equipamento: dados.equipamento,
        tipo_consulta: dados.tipo_consulta,
        valor: dados.valor,
        data: dados.data_agendamento,
        hora: dados.hora_agendamento,
      });

      console.log(`📅 Agendamento criado para ${dados.nome} em ${dados.data_agendamento} às ${dados.hora_agendamento}`);
    }
  } catch (error) {
    console.error("Erro ao processar dados coletados:", error);
  }
}

// Salva ou atualiza os dados do cliente
async function upsertCliente(dados) {
  const { error } = await supabase.from("clientes").upsert(
    {
      telefone: dados.telefone,
      nome: dados.nome,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "telefone" }
  );

  if (error) console.error("Erro ao salvar cliente:", error);
}

module.exports = { receberWebhook };
