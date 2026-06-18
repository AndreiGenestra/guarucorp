const express = require("express");
const router = express.Router();
const { receberWebhook } = require("../controllers/webhookController");

// A Evolution API vai chamar esta rota sempre que chegar uma mensagem nova
router.post("/", receberWebhook);

module.exports = router;
