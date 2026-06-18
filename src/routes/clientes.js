const express = require("express");
const router = express.Router();
const supabase = require("../../config/database");

// Lista todos os clientes
// GET /clientes
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;
    res.json({ clientes: data });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Busca um cliente pelo telefone com histórico de atendimentos
// GET /clientes/:telefone
router.get("/:telefone", async (req, res) => {
  try {
    const { telefone } = req.params;

    const { data: cliente, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("telefone", telefone)
      .single();

    if (error) return res.status(404).json({ erro: "Cliente não encontrado" });

    // Busca os agendamentos do cliente
    const { data: agendamentos } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false });

    res.json({ cliente, agendamentos: agendamentos || [] });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;
