-- =========================================================
-- EXECUTE ESTE SQL NO EDITOR DO SUPABASE
-- (SQL Editor > New Query > Cole tudo aqui > Run)
-- =========================================================

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT UNIQUE NOT NULL,
  nome TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de sessões de conversa
CREATE TABLE IF NOT EXISTS sessoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  historico JSONB DEFAULT '[]',      -- Array com o histórico de mensagens
  status TEXT DEFAULT 'iniciado',    -- iniciado | aguardando_pagamento | agendado | encerrado
  dados_atendimento JSONB,           -- Dados coletados pelo bot (JSON livre)
  ativa BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  nome TEXT,
  problema TEXT,
  equipamento TEXT,
  tipo_consulta TEXT,                -- basica | tecnica | urgente
  valor NUMERIC(10, 2),
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status TEXT DEFAULT 'aguardando_pagamento',  -- aguardando_pagamento | confirmado | cancelado | concluido
  pagamento_confirmado_em TIMESTAMPTZ,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas mais rápidas
CREATE INDEX IF NOT EXISTS idx_sessoes_telefone ON sessoes(telefone);
CREATE INDEX IF NOT EXISTS idx_sessoes_ativa ON sessoes(ativa);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_telefone ON agendamentos(telefone);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- =========================================================
-- DADOS DE EXEMPLO (opcional, pode remover se quiser)
-- =========================================================

INSERT INTO clientes (telefone, nome) VALUES
  ('5511999990001', 'Maria Exemplo'),
  ('5511999990002', 'José Teste')
ON CONFLICT (telefone) DO NOTHING;
