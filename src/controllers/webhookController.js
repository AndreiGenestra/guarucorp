const { extrairDadosWebhook, enviarMensagem } = require("../services/whatsappService");
const { gerarResposta } = require("../services/claudeService"); // Note: Seu arquivo interno usa Gemini
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

  // 1. LISTENING DA ENTRADA DO WEBHOOK
  console.log("\n📥 [LISTENING] Nova requisição recebida na rota /webhook");

  try {
    const dados = extrairDadosWebhook(req.body);

    // Ignora se não conseguiu extrair dados ou se é mensagem do próprio bot
    if (!dados || dados.fromMe || !dados.mensagem) {
      console.log("ℹ️ Evento ignorado (Mensagem enviada pelo próprio bot ou sem texto)");
      return;
    }

    let { telefone, mensagem } = dados;

// CORREÇÃO PARA REMOVER O @lid E GARANTIR O FORMATO CORRETO DE ENVIO:
if (telefone.includes("@lid")) {
  // Remove o '@lid', pega só os números, e coloca o sufixo padrão do WhatsApp
  telefone = telefone.split("@")[0] + "@s.whatsapp.net";
} else if (!telefone.includes("@")) {
  // Se vier só número puro por algum motivo, garante o sufixo
  telefone = `${telefone}@s.whatsapp.net`;
}

    console.log(`📩 Mensagem recebida de ${telefone}: "${mensagem}"`);

    // Busca ou cria sessão do cliente
    let sessao = await buscarSessao(telefone);
    if (!sessao) {
      sessao = await criarSessao(telefone);
      console.log(`🆕 Nova sessão criada para ${telefone}`);
    }

    // Adiciona a mensagem do usuário ao histórico
    await adicionarMensagem(sessao.id, "user", mensagem);

    // 2. LISTENING DA IA
    console.log("🤖 Chamando a API da Inteligência Artificial...");
    
    // CORREÇÃO: Como o seu arquivo de serviço retorna 'response.text' (string direta), 
    // pegamos o retorno puro sem tentar desestruturar um objeto que não existe.
    const respostaIA = await gerarResposta(sessao.historico, mensagem);
    
    console.log(`✨ [LISTENING] Resposta gerada pela IA: "${respostaIA}"`);

    // Adiciona a resposta do bot ao histórico
    await adicionarMensagem(sessao.id, "assistant", respostaIA);

    // Se futuramente seu modelo coletar dados estruturados, trate aqui. 
    // Se 'respostaIA' for string pura, 'dadosColetados' temporariamente não existirá.
    const dadosColetados = respostaIA.dadosColetados || null;
    if (dadosColetados) {
      await processarDadosColetados(sessao, dadosColetados, telefone);
    }

    // 3. LISTENING DO ENVIO DO WHATSAPP
    console.log(`🚀 [LISTENING] Enviando para o whatsappService -> Telefone: ${telefone}`);
    
    // CORREÇÃO: Passando a variável correta contendo a string gerada pela IA
    await enviarMensagem(telefone, respostaIA);

    console.log(`✅ Resposta enviada com sucesso para ${telefone}`);
  } catch (error) {
    console.error("❌ Erro detectado no fluxo principal do webhook:");
    
    // Intercepta erros específicos do Axios / Evolution API
    if (error.response) {
      console.error("📋 [LISTENING ERRO EVOLUTION API]:", JSON.stringify(error.response.data, null, 2));
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
async function processarDadosColetados(sessao, dados, telefone) {
  try {
    await upsertCliente({
      telefone,
      nome: dados.nome,
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