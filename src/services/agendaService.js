const supabase = require("../../config/database");
const moment = require("moment-timezone");

const TIMEZONE = process.env.TIMEZONE || "America/Sao_Paulo";
const HORA_INICIO = process.env.HORARIO_INICIO || "08:00";
const HORA_FIM = process.env.HORARIO_FIM || "18:00";
const DURACAO = parseInt(process.env.DURACAO_CONSULTA_MINUTOS || "30");

// Gera todos os horários disponíveis de um dia
function gerarSlotsDoDia(data) {
  const slots = [];
  const inicio = moment.tz(`${data} ${HORA_INICIO}`, TIMEZONE);
  const fim = moment.tz(`${data} ${HORA_FIM}`, TIMEZONE);

  let atual = inicio.clone();
  while (atual.isBefore(fim)) {
    slots.push(atual.format("HH:mm"));
    atual.add(DURACAO, "minutes");
  }

  return slots;
}

// Busca horários já agendados num dia específico
async function buscarHorariosOcupados(data) {
  const { data: agendamentos, error } = await supabase
    .from("agendamentos")
    .select("hora")
    .eq("data", data)
    .neq("status", "cancelado");

  if (error) {
    console.error("Erro ao buscar horários:", error);
    return [];
  }

  return agendamentos.map((a) => a.hora);
}

// Retorna os horários livres de uma data
async function buscarHorariosDisponiveis(data) {
  const todosSlots = gerarSlotsDoDia(data);
  const ocupados = await buscarHorariosOcupados(data);

  const disponiveis = todosSlots.filter((slot) => !ocupados.includes(slot));
  return disponiveis;
}

// Cria um novo agendamento
async function criarAgendamento(dados) {
  const {
    telefone,
    nome,
    problema,
    equipamento,
    tipo_consulta,
    valor,
    data,
    hora,
  } = dados;

  // Verifica se o horário ainda está disponível
  const disponiveis = await buscarHorariosDisponiveis(data);
  if (!disponiveis.includes(hora)) {
    throw new Error("Horário não disponível. Tente outro horário.");
  }

  const { data: agendamento, error } = await supabase
    .from("agendamentos")
    .insert({
      telefone,
      nome,
      problema,
      equipamento,
      tipo_consulta,
      valor,
      data,
      hora,
      status: "aguardando_pagamento",
      criado_em: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return agendamento;
}

// Confirma o pagamento de um agendamento
async function confirmarPagamento(agendamentoId) {
  const { error } = await supabase
    .from("agendamentos")
    .update({
      status: "confirmado",
      pagamento_confirmado_em: new Date().toISOString(),
    })
    .eq("id", agendamentoId);

  if (error) throw error;
}

// Retorna os próximos agendamentos do técnico
async function buscarProximosAgendamentos(limite = 10) {
  const hoje = moment.tz(TIMEZONE).format("YYYY-MM-DD");

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .gte("data", hoje)
    .eq("status", "confirmado")
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .limit(limite);

  if (error) throw error;
  return data;
}

module.exports = {
  buscarHorariosDisponiveis,
  criarAgendamento,
  confirmarPagamento,
  buscarProximosAgendamentos,
};
