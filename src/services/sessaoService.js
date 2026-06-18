const supabase = require("../../config/database");

// Busca a sessão ativa de um cliente pelo telefone
async function buscarSessao(telefone) {
  const { data, error } = await supabase
    .from("sessoes")
    .select("*")
    .eq("telefone", telefone)
    .eq("ativa", true)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Erro ao buscar sessão:", error);
  }

  return data || null;
}

// Cria uma nova sessão para o cliente
async function criarSessao(telefone) {
  const novaSessao = {
    telefone,
    historico: [],  // Array de { role: 'user'|'assistant', content: '...' }
    status: "iniciado",
    ativa: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("sessoes")
    .insert(novaSessao)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Adiciona uma mensagem ao histórico da sessão
async function adicionarMensagem(sessaoId, role, content) {
  // Busca o histórico atual
  const { data: sessao } = await supabase
    .from("sessoes")
    .select("historico")
    .eq("id", sessaoId)
    .single();

  const historico = sessao?.historico || [];
  historico.push({ role, content });

  // Mantém apenas as últimas 20 mensagens pra não explodir o tamanho
  const historicoLimitado = historico.slice(-20);

  const { error } = await supabase
    .from("sessoes")
    .update({
      historico: historicoLimitado,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", sessaoId);

  if (error) throw error;
}

// Atualiza o status e dados do atendimento na sessão
async function atualizarSessao(sessaoId, dados) {
  const { error } = await supabase
    .from("sessoes")
    .update({
      ...dados,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", sessaoId);

  if (error) throw error;
}

// Encerra a sessão (quando o atendimento for concluído)
async function encerrarSessao(sessaoId) {
  await atualizarSessao(sessaoId, { ativa: false, status: "encerrado" });
}

module.exports = {
  buscarSessao,
  criarSessao,
  adicionarMensagem,
  atualizarSessao,
  encerrarSessao,
};
