const { extrairDadosWebhook, enviarMensagem } = require("../services/whatsappService");
const { processarMensagem } = require("../services/claudeService");
const {
  buscarSessao,
  criarSessao,
  adicionarMensagem,
  atualizarSessao,
} = require("../services/sessaoService");
const { criarAgendamento } = require("../services/agendaService");
const supabase = require("../../config/database");

async function receberWebhook(req, res) {
  // Responde imediatamente pra Evolution API não reenviar
  res.status(200).json({ status: "ok" });

  try {
    const dados = extrairDadosWebhook(req.body);

    // Ignora se não conseguiu extrair dados ou se é mensagem do próprio bot
    if (!dados || dados.fromMe || !dados.mensagem) return;

    const { telefone, mensagem } = dados;

    console.log(`📩 Mensagem recebida de ${telefone}: ${mensagem}`);

    // Busca ou cria sessão do cliente
    let sessao = await buscarSessao(telefone);
    if (!sessao) {
      sessao = await criarSessao(telefone);
      console.log(`🆕 Nova sessão criada para ${telefone}`);
    }

    // Adiciona a mensagem do usuário ao histórico
    await adicionarMensagem(sessao.id, "user", mensagem);

    // Envia pro Claude processar
    const { mensagem: resposta, dadosColetados } = await processarMensagem(
      sessao.historico,
      mensagem
    );

    // Adiciona a resposta do bot ao histórico
    await adicionarMensagem(sessao.id, "assistant", resposta);

    // Se o Claude coletou dados estruturados, salva no banco
    if (dadosColetados) {
      await processarDadosColetados(sessao, dadosColetados, telefone);
    }

    // Envia a resposta pro WhatsApp do cliente
    await enviarMensagem(telefone, resposta);

    console.log(`✅ Resposta enviada para ${telefone}`);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);

    // Tenta enviar mensagem de erro pro cliente
    try {
      const dados = extrairDadosWebhook(req.body);
      if (dados?.telefone) {
        await enviarMensagem(
          dados.telefone,
          "Desculpe, tive um probleminha técnico. Pode me mandar a mensagem novamente? 🙏"
        );
      }
    } catch {}
  }
}

// Salva os dados coletados pelo Claude no banco
async function processarDadosColetados(sessao, dados, telefone) {
  try {
    // Salva/atualiza os dados do cliente
    await upsertCliente({
      telefone,
      nome: dados.nome,
    });

    // Atualiza a sessão com os dados coletados
    await atualizarSessao(sessao.id, {
      status: dados.status,
      dados_atendimento: dados,
    });

    // Se chegou na etapa de agendamento, cria o agendamento
    if (
      dados.status === "agendado" &&
      dados.data_agendamento &&
      dados.hora_agendamento
    ) {
      await criarAgendamento({
        telefone,
        nome: dados.nome,
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
