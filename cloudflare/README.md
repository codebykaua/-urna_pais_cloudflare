# Urna Pais API - Cloudflare Workers + D1

Backend para a urna escolar do segmento PAIS. O site estatico chama esta API para:

- listar candidatos
- registrar votos
- autenticar o admin
- gerar relatorio

## Endpoints

```txt
GET  /api/health
GET  /api/candidatos-pais
POST /api/votos-pais
POST /api/admin/login
GET  /api/relatorio-pais
```

## Deploy

1. Entre na pasta:

```bash
cd cloudflare
```

2. Faca login:

```bash
npx wrangler login
```

3. Crie o banco D1:

```bash
npx wrangler d1 create urna-pais-d1
```

4. Copie o `database_id` retornado e cole em `wrangler.toml`.

5. Crie as tabelas e candidatos iniciais:

```bash
npx wrangler d1 execute urna-pais-d1 --remote --file=./schema.sql
```

6. Configure a senha do admin:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

7. Configure um token interno do admin:

```bash
npx wrangler secret put ADMIN_TOKEN
```

Use um valor longo e aleatorio. Exemplo para gerar:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

8. Publique:

```bash
npx wrangler deploy
```

9. Se a API ficar em outro dominio, coloque a URL do Worker em `api-config.js`:

```js
window.URNA_CLOUDFLARE_API = {
  baseUrl: "https://urna-pais-api.seu-usuario.workers.dev",
  segmento: "pais",
  endpoints: {
    candidatos: "/api/candidatos-pais",
    votar: "/api/votos-pais",
    relatorio: "/api/relatorio-pais",
    loginAdmin: "/api/admin/login"
  }
};
```

Se a API estiver no mesmo dominio do site, deixe `baseUrl` vazio.

## Testes rapidos

```txt
GET /api/health
GET /api/candidatos-pais
POST /api/votos-pais
POST /api/admin/login
GET /api/relatorio-pais
```

Exemplo de voto:

```json
{
  "candidatoId": "candidato-1",
  "candidatoNome": "NOELIA BRITO DOS SANTOS",
  "segmento": "pais"
}
```

Para limpar votos de teste no D1, rode somente quando tiver certeza:

```sql
DELETE FROM votos_pais;
UPDATE candidatos_pais SET votos = 0;
```

## Erro de chave estrangeira no voto

Se aparecer `SQLITE_CONSTRAINT_FOREIGNKEY`, confira se o D1 remoto tem os candidatos oficiais:

```bash
npx wrangler d1 execute urna-pais-d1 --remote --command "SELECT id, nome FROM candidatos_pais ORDER BY CAST(numero AS INTEGER);"
```

Se algum `candidato-1` ate `candidato-6` nao aparecer, rode novamente o schema:

```bash
npx wrangler d1 execute urna-pais-d1 --remote --file=./schema.sql
```

Se o erro apareceu ao apagar candidatos, apague primeiro os votos relacionados:

```sql
DELETE FROM votos_pais;
DELETE FROM candidatos_pais;
```
