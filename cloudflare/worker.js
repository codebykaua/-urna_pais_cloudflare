const SEGMENTO = "pais";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8"
};

export default {
  async fetch(request, env) {
    const corsHeaders = criarCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);

      if (request.method === "GET" && rotaEh(url.pathname, ["/", "/api/health", "/health"])) {
        return responderJson({ ok: true, service: "urna-pais-api" }, 200, corsHeaders);
      }

      if (request.method === "GET" && rotaEh(url.pathname, ["/api/candidatos-pais", "/api/candidatos"])) {
        return listarCandidatos(env, corsHeaders);
      }

      if (request.method === "POST" && rotaEh(url.pathname, ["/api/votos-pais", "/api/votar"])) {
        return registrarVoto(request, env, corsHeaders);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/login") {
        return loginAdmin(request, env, corsHeaders);
      }

      if (request.method === "GET" && rotaEh(url.pathname, ["/api/relatorio-pais", "/api/relatorio"])) {
        return gerarRelatorio(request, env, corsHeaders);
      }

      return responderJson({ ok: false, erro: "ROTA_NAO_ENCONTRADA" }, 404, corsHeaders);
    } catch (error) {
      console.error("Erro inesperado:", error);
      return responderJson({ ok: false, erro: "ERRO_INTERNO" }, 500, corsHeaders);
    }
  }
};

async function listarCandidatos(env, corsHeaders) {
  const candidatos = await buscarCandidatosAtivos(env);
  return responderJson({ ok: true, candidatos }, 200, corsHeaders);
}

async function registrarVoto(request, env, corsHeaders) {
  const corpo = await lerJson(request);
  const candidatoId = String(corpo.candidatoId || "").trim();

  if (!candidatoId) {
    return responderJson({ ok: false, erro: "CANDIDATO_OBRIGATORIO" }, 400, corsHeaders);
  }

  const candidato = await env.DB
    .prepare("SELECT id, nome FROM candidatos_pais WHERE id = ? AND ativo = 1")
    .bind(candidatoId)
    .first();

  if (!candidato) {
    return responderJson({ ok: false, erro: "CANDIDATO_NAO_ENCONTRADO" }, 404, corsHeaders);
  }

  const votoId = crypto.randomUUID();
  const criadoEm = new Date().toISOString();

  await env.DB.batch([
    env.DB
      .prepare(
        "INSERT INTO votos_pais (id, candidato_id, candidato_nome, segmento, criado_em) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(votoId, candidato.id, candidato.nome, SEGMENTO, criadoEm),
    env.DB
      .prepare("UPDATE candidatos_pais SET votos = votos + 1 WHERE id = ? AND ativo = 1")
      .bind(candidato.id)
  ]);

  return responderJson({
    ok: true,
    votoId,
    candidatoNome: candidato.nome,
    segmento: SEGMENTO
  }, 201, corsHeaders);
}

async function loginAdmin(request, env, corsHeaders) {
  const corpo = await lerJson(request);
  const email = String(corpo.email || "").trim();
  const senha = String(corpo.senha || "");

  if (!env.ADMIN_PASSWORD || !env.ADMIN_TOKEN) {
    return responderJson({ ok: false, erro: "ADMIN_NAO_CONFIGURADO" }, 500, corsHeaders);
  }

  if (email !== env.ADMIN_EMAIL || senha !== env.ADMIN_PASSWORD) {
    return responderJson({ ok: false, erro: "CREDENCIAIS_INVALIDAS" }, 401, corsHeaders);
  }

  return responderJson({ ok: true, token: env.ADMIN_TOKEN }, 200, corsHeaders);
}

async function gerarRelatorio(request, env, corsHeaders) {
  if (!adminAutorizado(request, env)) {
    return responderJson({ ok: false, erro: "NAO_AUTORIZADO" }, 401, corsHeaders);
  }

  const candidatos = await buscarCandidatosAtivos(env);
  const total = candidatos.reduce((soma, candidato) => soma + Number(candidato.votos || 0), 0);

  return responderJson({ ok: true, candidatos, total, segmento: SEGMENTO }, 200, corsHeaders);
}

async function buscarCandidatosAtivos(env) {
  const resultado = await env.DB
    .prepare(
      "SELECT id, nome, numero, foto, ativo, votos FROM candidatos_pais WHERE ativo = 1 ORDER BY CAST(numero AS INTEGER), nome"
    )
    .all();

  return (resultado.results || []).map((candidato) => ({
    id: candidato.id,
    nome: candidato.nome,
    numero: candidato.numero,
    foto: candidato.foto,
    ativo: Boolean(candidato.ativo),
    votos: Number(candidato.votos || 0)
  }));
}

function adminAutorizado(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  return Boolean(env.ADMIN_TOKEN && token && token === env.ADMIN_TOKEN);
}

async function lerJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function responderJson(corpo, status, corsHeaders) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders
    }
  });
}

function criarCorsHeaders(request, env) {
  const origem = request.headers.get("origin") || "*";
  const permitidas = String(env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const permiteTudo = permitidas.includes("*");
  const origemPermitida = permiteTudo || permitidas.includes(origem) ? origem : permitidas[0] || "*";

  return {
    "access-control-allow-origin": permiteTudo ? "*" : origemPermitida,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400"
  };
}

function rotaEh(pathname, rotas) {
  return rotas.includes(pathname);
}