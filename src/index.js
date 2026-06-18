require("dotenv").config();
const express = require("express");
const cors = require("cors");

const webhookRoutes = require("./routes/webhook");
const agendaRoutes = require("./routes/agenda");
const clientesRoutes = require("./routes/clientes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/webhook", webhookRoutes);       // Recebe mensagens do WhatsApp
app.use("/agenda", agendaRoutes);         // Gerencia agendamentos
app.use("/clientes", clientesRoutes);     // Gerencia clientes

// Rota de health check (usada pelo UptimeRobot pra manter o servidor acordado)
app.get("/health", (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
});
