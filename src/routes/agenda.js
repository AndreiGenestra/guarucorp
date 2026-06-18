const express = require("express");
const router = express.Router();
const {
  buscarHorariosDisponiveis,
  buscarProximosAgendamentos,
  confirmarPagamento,
} = require("../services/agendaService");

// Lista horários disponíveis de uma data
// GET /agenda/disponivel?data=2025-01-20
router.get("/disponivel", async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) {
      return res.status(400).json({ erro: "Informe a data no formato YYYY-MM-DD" });
    }

    const horarios = await buscarHorariosDisponiveis(data);
    res.json({ data, horarios_disponiveis: horarios });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Lista os próximos agendamentos confirmados
// GET /agenda/proximos
router.get("/proximos", async (req, res) => {
  try {
    const agendamentos = await buscarProximosAgendamentos();
    res.json({ agendamentos });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Confirma o pagamento manualmente (técnico usa isso)
// PATCH /agenda/:id/confirmar-pagamento
router.patch("/:id/confirmar-pagamento", async (req, res) => {
  try {
    const { id } = req.params;
    await confirmarPagamento(id);
    res.json({ mensagem: "Pagamento confirmado com sucesso!" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;
