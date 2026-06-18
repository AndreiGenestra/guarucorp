# Como configurar o bot do zero

## Pré-requisitos
- Node.js 18+ instalado
- Conta no Supabase (supabase.com) — grátis
- Conta no Render (render.com) — grátis
- Chave da API do Claude (console.anthropic.com)
- Um número de WhatsApp exclusivo pra o bot

---

## Passo 1 — Configurar o Supabase

1. Crie uma conta em **supabase.com**
2. Crie um novo projeto
3. Vá em **SQL Editor > New Query**
4. Cole o conteúdo do arquivo `docs/criar_tabelas_supabase.sql` e clique em **Run**
5. Vá em **Project Settings > API** e copie:
   - `Project URL` → vai pra `SUPABASE_URL` no .env
   - `anon public key` → vai pra `SUPABASE_ANON_KEY` no .env

---

## Passo 2 — Subir a Evolution API no Render

1. Crie uma conta em **render.com**
2. Clique em **New > Web Service**
3. Escolha **Deploy from Docker Image**
4. Imagem: `atendai/evolution-api:latest`
5. Em **Environment Variables**, adicione:
   - `AUTHENTICATION_TYPE` = `apikey`
   - `AUTHENTICATION_API_KEY` = uma senha forte (ex: `minha-chave-123`)
   - `DATABASE_PROVIDER` = `postgresql`  
     (ou use o banco interno mesmo — para volume baixo funciona)
6. Anote a URL que o Render gerar (ex: `https://evolution-abc.onrender.com`)

---

## Passo 3 — Criar instância do WhatsApp na Evolution API

Com a Evolution API rodando, acesse o painel Swagger dela:
```
https://SUA-EVOLUTION-URL.onrender.com/docs
```

1. Vá em **Instance > Create Instance**
2. Dê um nome (ex: `arcondicionado-bot`)
3. Execute e copie o `instanceName`
4. Vá em **Instance > Connect** e escaneie o QR Code com o WhatsApp do bot

---

## Passo 4 — Configurar o projeto localmente

```bash
# Clone o projeto
git clone <seu-repositorio>
cd whatsapp-bot-arcondicionado

# Instale as dependências
npm install

# Copie o arquivo de configuração
cp .env.example .env

# Edite o .env com seus dados reais
nano .env
```

Preencha todas as variáveis no `.env`:
- Dados da Evolution API
- Chave do Claude (Anthropic)
- Dados do Supabase
- Dados do técnico (nome, Pix, telefone)

---

## Passo 5 — Hospedar o backend no Render

1. Suba o projeto pro GitHub
2. No Render: **New > Web Service > Connect GitHub**
3. Selecione o repositório
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Adicione todas as variáveis do `.env` nas **Environment Variables** do Render
6. Clique em **Deploy**
7. Anote a URL do seu backend (ex: `https://meu-bot.onrender.com`)

---

## Passo 6 — Configurar o Webhook na Evolution API

Agora você precisa dizer pra Evolution API onde mandar as mensagens:

```bash
curl -X POST "https://guarucorp.onrender.com/webhook/set/arcondicionado-bot" \
  -H "apikey: 080523$And20102007" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/webhook",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```

---

## Passo 7 — Manter o servidor acordado (grátis)

O Render no plano free dorme após 15 minutos sem uso.

1. Crie uma conta em **uptimerobot.com** (grátis)
2. Clique em **Add New Monitor**
3. Tipo: **HTTP(s)**
4. URL: `https://SEU-BACKEND.onrender.com/health`
5. Intervalo: **5 minutos**

Pronto! O servidor vai ficar sempre acordado.

---

## Testando o bot

Mande uma mensagem pro número do WhatsApp conectado e veja o bot responder!

Para ver os logs em tempo real:
```bash
# Localmente
npm run dev

# No Render: vá em Logs no painel do seu serviço
```

---

## Ajustando os preços

Edite o arquivo `config/precos.js` e altere os valores conforme necessário. Não precisa mexer em mais nada.

---

## Endpoints disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /webhook | Recebe mensagens do WhatsApp |
| GET | /health | Status do servidor |
| GET | /agenda/disponivel?data=YYYY-MM-DD | Horários livres |
| GET | /agenda/proximos | Próximos agendamentos |
| PATCH | /agenda/:id/confirmar-pagamento | Confirma pagamento |
| GET | /clientes | Lista clientes |
| GET | /clientes/:telefone | Dados de um cliente |
