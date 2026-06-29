# Como configurar a Meta Cloud API (WhatsApp oficial)

## Por que migramos — o problema do @lid

A partir de um certo momento, conexões não-oficiais (Baileys, usado pela Evolution API) passaram a receber, em alguns contatos, um identificador `@lid` no lugar do número de telefone real no `remoteJid`. Esse `@lid` é um ID interno criptografado da Meta, criado como medida de privacidade/anti-automação contra conexões que não passam pelo processo oficial de aprovação.

**Não existe conversão confiável de `@lid` para o número de telefone real.** Trocar o sufixo (`@lid` → `@s.whatsapp.net`) não funciona, porque o problema está no conteúdo do identificador, não no formato — o texto antes do `@` não é o número da pessoa, é um código opaco.

Esse comportamento também é instável: a própria Evolution API trata isso como bug em aberto, com correções parciais lançadas release a release, o que significa que mesmo quando "funciona", pode voltar a falhar na próxima atualização do WhatsApp.

Além disso, há o risco mais grave: contas conectadas via Baileys/QR Code estão sujeitas a banimento permanente do número, já que essa forma de conexão não é sancionada pelo WhatsApp.

A **Meta Cloud API** resolve os dois problemas: você é um remetente autorizado oficialmente, então o campo `from` do webhook sempre traz o número de telefone real — nunca um `@lid` — e não há risco de banimento por uso de protocolo não-oficial.

---

## Passo 1 — Criar conta no Meta for Developers

1. Acesse **developers.facebook.com** e faça login com uma conta do Facebook
2. Clique em **Meus Apps > Criar App**
3. Escolha o tipo **"Outro"** e depois **"Empresa"**
4. Dê um nome ao app (ex: "Bot Guarucorp") e crie

---

## Passo 2 — Adicionar o produto WhatsApp

1. No painel do seu app, encontre o card **WhatsApp** e clique em **Configurar**
2. A Meta vai te dar automaticamente:
   - Um **número de teste** gratuito (pode usar pra testar antes de configurar o número real)
   - Um **Token de acesso temporário** (válido por 24h — depois trocamos por um permanente)
   - O **Phone Number ID**

3. Anote os dados que aparecem em **WhatsApp > Início**:
   - **Phone number ID** → vai pra `META_PHONE_NUMBER_ID`
   - **Temporary access token** → vai pra `META_ACCESS_TOKEN` (por agora)

---

## Passo 3 — Testar o envio (antes de configurar o webhook)

Na página de início do WhatsApp no painel da Meta, tem um campo **"To"** com um número de teste pré-cadastrado. Adicione seu próprio número de WhatsApp em "Manage phone number list" e clique em **Send Message** com o template de teste.

Se você receber a mensagem no seu WhatsApp, a configuração básica está funcionando.

---

## Passo 4 — Gerar um Token de Acesso Permanente

1. Vá em **Configurações do App > Básico** e anote o **App ID** e o **App Secret**
2. Acesse o **Business Settings** (business.facebook.com/settings)
3. Em **Usuários > Usuários do sistema**, crie um **usuário de sistema** (System User)
4. Atribua a ele acesso ao seu app do WhatsApp
5. Clique em **Gerar novo token**, selecione seu app, e marque as permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Copie esse token — ele não expira automaticamente

Esse token vai pra `META_ACCESS_TOKEN` na versão final.

---

## Passo 5 — Configurar o Webhook

1. No painel do app, vá em **WhatsApp > Configuração**
2. No campo **Callback URL**, coloque:
   ```
   https://SEU-BACKEND.onrender.com/webhook
   ```
3. No campo **Verify Token**, coloque a mesma senha que você definiu na variável `META_VERIFY_TOKEN` do seu `.env`
4. Clique em **Verificar e salvar**

> A Meta faz uma requisição GET pro seu backend pra confirmar que o servidor é seu. A rota `/webhook` (GET) já está implementada no projeto — se o token bater, a verificação passa automaticamente.

5. Depois de verificado, marque a assinatura (subscribe) para o evento **messages**

---

## Passo 6 — Usar o número de WhatsApp real do técnico (produção)

O número de teste só envia mensagens para números cadastrados manualmente. Para uso real:

1. Vá em **WhatsApp > Configuração da API**
2. Clique em **Adicionar número de telefone**
3. Verifique o número via SMS ou ligação
4. Aprovação pode levar 1-2 dias

Durante a aprovação, você já pode testar tudo com o número de teste gratuito.

---

## Variáveis de ambiente necessárias

```env
META_PHONE_NUMBER_ID=123456789012345
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_API_VERSION=v21.0
META_VERIFY_TOKEN=uma-senha-que-voce-escolhe-123
GEMINI_API_KEY=sua-chave-do-google-ai-studio
```

> `META_VERIFY_TOKEN` não vem da Meta — **você** escolhe esse valor e coloca tanto no `.env` quanto no campo "Verify Token" do painel da Meta. É uma senha combinada entre os dois lados.

---

## O que muda no código (resumo desta migração)

| Arquivo | O que mudou |
|---|---|
| `whatsappService.js` | Reescrito para chamar `graph.facebook.com` em vez da Evolution API. `telefone` agora vem direto e correto do campo `from`, sem `@lid`. |
| `webhookController.js` | Removido o remendo manual de `@lid`. Ajustado para o novo retorno `{ mensagem, dadosColetados }` do `claudeService.js`. |
| `claudeService.js` (Gemini) | Corrigido para enviar o **histórico completo** da conversa ao Gemini (antes só mandava a última mensagem) e para extrair o bloco `[DADOS_COLETA]`, necessário pro agendamento funcionar. |
| `routes/webhook.js` | Adicionada rota **GET** de verificação, exigida pela Meta. |
| `.env.example` | Variáveis `EVOLUTION_*` substituídas por `META_*`; `ANTHROPIC_API_KEY` substituída por `GEMINI_API_KEY`. |

---

## ⚠️ Sobre o seu arquivo .env atual

Notei que o `.env.example` do seu projeto continha uma chave **real** do Supabase (não um placeholder). Como esse arquivo às vezes é versionado por engano, recomendo:

1. Verificar se esse arquivo foi enviado ao GitHub em algum momento
2. Se sim, considerar **rotacionar a chave do Supabase** (gerar uma nova em Project Settings > API)
3. Garantir que `.env` e `.env.example` com dados reais estejam sempre no `.gitignore`

---

## Testando depois de configurado

1. Suba as variáveis novas no Render (substitua as antigas `EVOLUTION_*` e `ANTHROPIC_API_KEY`)
2. Reinicie o serviço no Render
3. Mande uma mensagem do seu WhatsApp pessoal (cadastrado na lista de teste) para o número de teste da Meta
4. Acompanhe os logs no Render — você verá as mesmas mensagens de `[LISTENING]` que já tinha adicionado, só que agora sem nenhum `@lid` aparecendo
