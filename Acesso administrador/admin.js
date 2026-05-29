/* ===================================================
   PAINEL ADMINISTRATIVO - SEGMENTO PAIS
   Backend esperado: Cloudflare Workers/Pages Functions
   =================================================== */

"use strict";

const SEGMENTO = "pais";
const API_ADMIN_TOKEN_KEY = "urna_pais_api_admin_token";

const CANDIDATOS_EXEMPLO = [
  { id: "candidato-1", nome: "NOELIA BRITO DOS SANTOS", numero: "1", foto: "../images/candidato_pais_noelia.png", ativo: true, votos: 0 },
  { id: "candidato-2", nome: "EDVAN DE JESUS SANTOS", numero: "2", foto: "../images/candidato_pais_edvan.png", ativo: true, votos: 0 },
  { id: "candidato-3", nome: "ROGÉRIA DE JESUS MACEDO", numero: "3", foto: "../images/candidato_pais_rogeria.png", ativo: true, votos: 0 },
  { id: "candidato-4", nome: "MARICELSO DOS SANTOS BRITES", numero: "4", foto: "../images/candidato_pais_maricelso.png", ativo: true, votos: 0 },
  { id: "candidato-5", nome: "JOSEANE DE JESUS", numero: "5", foto: "../images/candidato_pais_joseane.png", ativo: true, votos: 0 },
  { id: "candidato-6", nome: "GEYSA CONCEIÇÃO DE SANTANA", numero: "6", foto: "../images/candidato_pais_geysa.png", ativo: true, votos: 0 }
];

const apiConfig = normalizarConfigApi(window.URNA_CLOUDFLARE_API);

const telaLogin = document.getElementById("admin-login-screen");
const telaDashboard = document.getElementById("admin-dashboard-screen");

const inputEmail = document.getElementById("input-email-admin");
const inputSenha = document.getElementById("input-senha-admin");
const msgErro = document.getElementById("login-error-admin");

const btnEntrar = document.getElementById("btn-entrar-admin");
const btnSair = document.getElementById("btn-sair-admin");
const btnAtualizarRelatorio = document.getElementById("btn-atualizar-relatorio");
const btnImprimirRelatorio = document.getElementById("btn-imprimir-relatorio");

const totalVotosTexto = document.getElementById("total-votos-texto");
const tabelaRelatorioBody = document.getElementById("tabela-relatorio-body");
const relatorioStatus = document.getElementById("relatorio-status");

document.addEventListener("DOMContentLoaded", iniciarAdminPais);

function iniciarAdminPais() {
  configurarEventosAdmin();

  if (sessionStorage.getItem(API_ADMIN_TOKEN_KEY)) {
    mostrarDashboard();
    gerarRelatorio();
    return;
  }

  mostrarTelaLogin();
}

function configurarEventosAdmin() {
  btnEntrar.addEventListener("click", fazerLoginAdmin);
  btnSair.addEventListener("click", sairAdmin);
  btnAtualizarRelatorio.addEventListener("click", gerarRelatorio);
  btnImprimirRelatorio.addEventListener("click", () => window.print());

  inputSenha.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      fazerLoginAdmin();
    }
  });
}

async function fazerLoginAdmin() {
  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  if (!email || !senha) {
    mostrarErro("Preencha e-mail e senha.");
    return;
  }

  bloquearLogin(true);

  try {
    const resposta = await fetch(endpoint("loginAdmin"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, senha, segmento: SEGMENTO })
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok || !dados.ok || !dados.token) {
      mostrarErro("E-mail ou senha incorretos.");
      return;
    }

    sessionStorage.setItem(API_ADMIN_TOKEN_KEY, dados.token);
    limparErro();
    mostrarDashboard();
    gerarRelatorio();
  } catch (error) {
    console.error("Erro de login na API:", error);
    mostrarErro("Erro ao entrar pela API Cloudflare. Verifique o Worker/Pages Functions.");
  } finally {
    bloquearLogin(false);
  }
}

function sairAdmin() {
  sessionStorage.removeItem(API_ADMIN_TOKEN_KEY);
  mostrarTelaLogin();
}

function mostrarTelaLogin() {
  telaLogin.classList.add("active");
  telaDashboard.style.display = "none";
}

function mostrarDashboard() {
  telaLogin.classList.remove("active");
  telaDashboard.style.display = "block";
}

function bloquearLogin(bloquear) {
  btnEntrar.disabled = bloquear;
  btnEntrar.textContent = bloquear ? "Entrando..." : "Entrar";
}

function mostrarErro(mensagem) {
  msgErro.textContent = mensagem;
  msgErro.classList.add("visible");
}

function limparErro() {
  msgErro.textContent = "";
  msgErro.classList.remove("visible");
}

// Gera o relatorio lendo candidatos/votos consolidados na API Cloudflare.
async function gerarRelatorio() {
  setRelatorioCarregando(true);

  try {
    const candidatos = await carregarCandidatosRelatorio();
    const resultado = calcularResultados(candidatos);
    renderizarRelatorio(resultado.linhas, resultado.total);
  } catch (error) {
    console.error("Erro ao gerar relatorio:", error);

    if (error.code === "api-unauthorized") {
      sessionStorage.removeItem(API_ADMIN_TOKEN_KEY);
      relatorioStatus.textContent = "Sessao expirada. Entre novamente.";
      mostrarTelaLogin();
      return;
    }

    relatorioStatus.textContent = "Erro ao carregar dados da API Cloudflare.";
  } finally {
    setRelatorioCarregando(false);
  }
}

async function carregarCandidatosRelatorio() {
  const token = sessionStorage.getItem(API_ADMIN_TOKEN_KEY);

  if (!token) {
    const error = new Error("API_ADMIN_SEM_LOGIN");
    error.code = "api-unauthorized";
    throw error;
  }

  const resposta = await fetch(endpoint("relatorio"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const dados = await resposta.json().catch(() => ({}));

  if (resposta.status === 401) {
    const error = new Error("API_ADMIN_SEM_LOGIN");
    error.code = "api-unauthorized";
    throw error;
  }

  if (!resposta.ok || !dados.ok) {
    throw new Error(dados.erro || "API_RELATORIO_ERRO");
  }

  return ordenarCandidatos((dados.candidatos || CANDIDATOS_EXEMPLO).map((candidato) => ({
    id: candidato.id,
    nome: candidato.nome || "Candidato sem nome",
    numero: candidato.numero || "",
    foto: normalizarFotoParaAdmin(candidato.foto || "../images/candidato_pais_noelia.png"),
    ativo: candidato.ativo !== false,
    votos: Number(candidato.votos || 0)
  })));
}

function ordenarCandidatos(candidatos) {
  return [...candidatos]
    .filter((candidato) => candidato.ativo !== false)
    .sort((a, b) => {
      const numeroA = Number(a.numero);
      const numeroB = Number(b.numero);

      if (!Number.isNaN(numeroA) && !Number.isNaN(numeroB) && numeroA !== numeroB) {
        return numeroA - numeroB;
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function normalizarFotoParaAdmin(foto) {
  if (!foto) {
    return "../images/candidato_pais_noelia.png";
  }

  const fotoTratada = String(foto).trim();
  const caminhoAbsoluto = /^(https?:|data:|blob:|\/)/i.test(fotoTratada);

  if (caminhoAbsoluto || fotoTratada.startsWith("../") || fotoTratada.startsWith("./")) {
    return fotoTratada;
  }

  if (fotoTratada.startsWith("images/")) {
    return `../${fotoTratada}`;
  }

  return fotoTratada;
}

function calcularResultados(candidatos) {
  const total = candidatos.reduce((soma, candidato) => soma + Number(candidato.votos || 0), 0);

  const linhas = candidatos.map((candidato) => {
    const votos = Number(candidato.votos || 0);

    return {
      id: candidato.id,
      nome: candidato.nome,
      foto: candidato.foto,
      votos,
      porcentagem: total > 0 ? (votos / total) * 100 : 0
    };
  });

  return {
    linhas: linhas.sort((a, b) => {
      if (b.votos !== a.votos) {
        return b.votos - a.votos;
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    }),
    total
  };
}

function renderizarRelatorio(linhas, total) {
  totalVotosTexto.textContent = String(total);
  tabelaRelatorioBody.innerHTML = "";

  if (linhas.length === 0) {
    const linhaVazia = document.createElement("tr");
    const coluna = document.createElement("td");
    coluna.colSpan = 3;
    coluna.textContent = "Nenhum candidato encontrado.";
    linhaVazia.appendChild(coluna);
    tabelaRelatorioBody.appendChild(linhaVazia);
    relatorioStatus.textContent = "Nenhum dado disponivel.";
    return;
  }

  linhas.forEach((linha) => {
    tabelaRelatorioBody.appendChild(criarLinhaRelatorio(linha));
  });

  relatorioStatus.textContent =
    total === 0
      ? "Nenhum voto registrado ainda."
      : `Relatorio atualizado com ${total} voto(s) registrado(s).`;
}

function criarLinhaRelatorio(linha) {
  const tr = document.createElement("tr");

  const candidatoTd = document.createElement("td");
  const candidatoInfo = document.createElement("div");
  candidatoInfo.className = "candidate-info";

  if (linha.foto) {
    const foto = document.createElement("img");
    foto.src = linha.foto;
    foto.alt = `Foto de ${linha.nome}`;
    candidatoInfo.appendChild(foto);
  }

  const nome = document.createElement("strong");
  nome.textContent = linha.nome;
  candidatoInfo.appendChild(nome);
  candidatoTd.appendChild(candidatoInfo);

  const votosTd = document.createElement("td");
  votosTd.textContent = `${linha.votos} voto(s)`;

  const porcentagemTd = document.createElement("td");
  const percentualTexto = formatarPercentual(linha.porcentagem);
  const barra = document.createElement("div");
  barra.className = "percent-bar";

  const preenchimento = document.createElement("span");
  preenchimento.style.width = `${Math.min(linha.porcentagem, 100)}%`;
  barra.appendChild(preenchimento);

  const percentual = document.createElement("strong");
  percentual.textContent = percentualTexto;

  porcentagemTd.appendChild(percentual);
  porcentagemTd.appendChild(barra);

  tr.appendChild(candidatoTd);
  tr.appendChild(votosTd);
  tr.appendChild(porcentagemTd);

  return tr;
}

function formatarPercentual(valor) {
  const arredondado = Math.round(valor * 10) / 10;
  return `${String(arredondado).replace(".", ",")}%`;
}

function setRelatorioCarregando(carregando) {
  btnAtualizarRelatorio.disabled = carregando;
  btnAtualizarRelatorio.textContent = carregando ? "Atualizando..." : "Atualizar relatorio";

  if (carregando) {
    relatorioStatus.textContent = "Buscando dados na API Cloudflare...";
  }
}

function endpoint(nome) {
  return `${apiConfig.baseUrl}${apiConfig.endpoints[nome]}`;
}

function normalizarConfigApi(config) {
  const cfg = config || {};
  const endpoints = cfg.endpoints || {};

  return {
    baseUrl: String(cfg.baseUrl || "").trim().replace(/\/+$/, ""),
    segmento: cfg.segmento || SEGMENTO,
    endpoints: {
      candidatos: endpoints.candidatos || "/api/candidatos-pais",
      votar: endpoints.votar || "/api/votos-pais",
      relatorio: endpoints.relatorio || "/api/relatorio-pais",
      loginAdmin: endpoints.loginAdmin || "/api/admin/login"
    }
  };
}
