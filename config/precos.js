// =============================================
// TABELA DE PREÇOS - Edite conforme necessário
// =============================================

const PRECOS = {
  // Consultas por tipo de problema
  consulta: {
    basica: {
      descricao: "Consulta básica (dúvida simples)",
      valor: 30,
    },
    tecnica: {
      descricao: "Consulta técnica (diagnóstico detalhado)",
      valor: 60,
    },
    urgente: {
      descricao: "Consulta urgente (mesmo dia)",
      valor: 90,
    },
  },

  // Tipos de equipamento (pode adicionar margem ao preço)
  equipamento: {
    split: { nome: "Split", adicional: 0 },
    split_inverter: { nome: "Split Inverter", adicional: 10 },
    janela: { nome: "Ar de janela", adicional: 0 },
    portatil: { nome: "Ar portátil", adicional: 0 },
    central: { nome: "Ar central / VRF", adicional: 20 },
    cassete: { nome: "Cassete", adicional: 15 },
  },
};

// Função que calcula o orçamento com base nas respostas do cliente
function calcularOrcamento(tipoConsulta, tipoEquipamento) {
  const consulta = PRECOS.consulta[tipoConsulta] || PRECOS.consulta.basica;
  const equipamento = PRECOS.equipamento[tipoEquipamento] || { adicional: 0 };

  const total = consulta.valor + equipamento.adicional;

  return {
    descricao: consulta.descricao,
    equipamento: equipamento.nome || tipoEquipamento,
    valor: total,
    valorFormatado: `R$ ${total},00`,
  };
}

module.exports = { PRECOS, calcularOrcamento };
