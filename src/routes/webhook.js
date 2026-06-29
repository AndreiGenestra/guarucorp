const express = require("express");
const router = express.Router();
const { receberWebhook } = require("../controllers/webhookController");

// ===========================================================
// VERIFICAÇÃO DO WEBHOOK (exigida pela Meta)
// ===========================================================
// Quando você configura a URL do webhook no painel da Meta,
// ela faz uma chamada GET pra confirmar que o servidor é seu.
// Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const TOKEN_ESPERADO = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === TOKEN_ESPERADO) {
    console.log("✅ Webhook verificado com sucesso pela Meta");
    return res.status(200).send(challenge);
  }

  console.warn("❌ Falha na verificação do webhook — token não confere");
  return res.sendStatus(403);
});

// A Meta vai chamar esta rota (POST) sempre que chegar uma mensagem nova
router.post("/", receberWebhook);

module.exports = router;
