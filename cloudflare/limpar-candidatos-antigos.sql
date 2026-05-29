DELETE FROM votos_pais
WHERE candidato_id IN (
  'ana-clara',
  'joao-pedro',
  'maria-eduarda',
  'lucas-santos',
  'beatriz-lima'
);

DELETE FROM candidatos_pais
WHERE id IN (
  'ana-clara',
  'joao-pedro',
  'maria-eduarda',
  'lucas-santos',
  'beatriz-lima'
);
