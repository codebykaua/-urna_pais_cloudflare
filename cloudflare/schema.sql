CREATE TABLE IF NOT EXISTS candidatos_pais (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  numero TEXT NOT NULL,
  foto TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  votos INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votos_pais (
  id TEXT PRIMARY KEY,
  candidato_id TEXT NOT NULL,
  candidato_nome TEXT NOT NULL,
  segmento TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (candidato_id) REFERENCES candidatos_pais(id)
);

CREATE INDEX IF NOT EXISTS idx_candidatos_pais_ativo_numero
  ON candidatos_pais (ativo, numero);

CREATE INDEX IF NOT EXISTS idx_votos_pais_criado_em
  ON votos_pais (criado_em);

INSERT INTO candidatos_pais (id, nome, numero, foto, ativo, votos) VALUES
  ('candidato-1', 'NOELIA BRITO DOS SANTOS', '1', 'images/candidato_pais_noelia.png', 1, 0),
  ('candidato-2', 'EDVAN DE JESUS SANTOS', '2', 'images/candidato_pais_edvan.png', 1, 0),
  ('candidato-3', 'ROGÉRIA DE JESUS MACEDO', '3', 'images/candidato_pais_rogeria.png', 1, 0),
  ('candidato-4', 'MARICELSO DOS SANTOS BRITES', '4', 'images/candidato_pais_maricelso.png', 1, 0),
  ('candidato-5', 'JOSEANE DE JESUS', '5', 'images/candidato_pais_joseane.png', 1, 0),
  ('candidato-6', 'GEYSA CONCEIÇÃO DE SANTANA', '6', 'images/candidato_pais_geysa.png', 1, 0)
ON CONFLICT(id) DO UPDATE SET
  nome = excluded.nome,
  numero = excluded.numero,
  foto = excluded.foto,
  ativo = excluded.ativo;

UPDATE candidatos_pais
SET ativo = 0
WHERE id IN (
  'ana-clara',
  'joao-pedro',
  'maria-eduarda',
  'lucas-santos',
  'beatriz-lima'
);
