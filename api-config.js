/* ===================================================
   Configuracao da API Cloudflare - Segmento PAIS

   Se o Worker/Pages Functions estiver no mesmo dominio
   do site, deixe baseUrl vazio.

   Se estiver em outro Worker, preencha assim:
   baseUrl: "https://sua-api.workers.dev"
   =================================================== */

window.URNA_CLOUDFLARE_API = {
  baseUrl: "https://white-bush-b1b2urna-pais-api.kaualucas9773.workers.dev/",
  segmento: "pais",
  endpoints: {
    candidatos: "/api/candidatos-pais",
    votar: "/api/votos-pais",
    relatorio: "/api/relatorio-pais",
    loginAdmin: "/api/admin/login"
  }
};
