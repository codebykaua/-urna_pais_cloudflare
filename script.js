/* ===================================================
   URNA ELETRONICA ESCOLAR - SEGMENTO PAIS
   Fluxo: escolher candidato -> confirmar -> salvar voto
   Backend esperado: Cloudflare Workers/Pages Functions
   =================================================== */

"use strict";

const SEGMENTO = "pais";

const FOTO_PADRAO = "images/candidato_pais_noelia.png";

const CANDIDATOS_EXEMPLO = [
  { id: "candidato-1", nome: "NOELIA BRITO DOS SANTOS", numero: "1", foto: "images/candidato_pais_noelia.png", ativo: true, votos: 0 },
  { id: "candidato-2", nome: "EDVAN DE JESUS SANTOS", numero: "2", foto: "images/candidato_pais_edvan.png", ativo: true, votos: 0 },
  { id: "candidato-3", nome: "ROGÉRIA DE JESUS MACEDO", numero: "3", foto: "images/candidato_pais_rogeria.png", ativo: true, votos: 0 },
  { id: "candidato-4", nome: "MARICELSO DOS SANTOS BRITES", numero: "4", foto: "images/candidato_pais_maricelso.png", ativo: true, votos: 0 },
  { id: "candidato-5", nome: "JOSEANE DE JESUS", numero: "5", foto: "images/candidato_pais_joseane.png", ativo: true, votos: 0 },
  { id: "candidato-6", nome: "GEYSA CONCEIÇÃO DE SANTANA", numero: "6", foto: "images/candidato_pais_geysa.png", ativo: true, votos: 0 }
];

const apiConfig = normalizarConfigApi(window.URNA_CLOUDFLARE_API);

let candidatosPais = [];
let candidatoSelecionado = null;
let votoBloqueado = false;

const screens = {
  votacao: document.getElementById("screen-votacao"),
  fim: document.getElementById("screen-fim")
};

const statusVotacao = document.getElementById("votacao-status");
const candidatosLista = document.getElementById("candidatos-lista");
const candidatosLoading = document.getElementById("candidatos-loading");

const overlayConfirm = document.getElementById("overlay-confirm");
const confirmFoto = document.getElementById("confirm-foto");
const confirmMessage = document.getElementById("confirm-message");
const btnCancelarVoto = document.getElementById("btn-cancelar-voto");
const btnConfirmarVoto = document.getElementById("btn-confirmar-voto");

document.addEventListener("DOMContentLoaded", iniciarUrnaPais);

function iniciarUrnaPais() {
  configurarEventos();
  carregarCandidatos();
  showScreen("votacao");
}

function configurarEventos() {
  btnCancelarVoto.addEventListener("click", cancelarSelecao);
  btnConfirmarVoto.addEventListener("click", confirmarVoto);

  overlayConfirm.addEventListener("click", (event) => {
    if (event.target === overlayConfirm) {
      cancelarSelecao();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlayConfirm.classList.contains("active")) {
      cancelarSelecao();
    }
  });
}

function showScreen(nome) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[nome].classList.add("active");
}

// Carrega candidatos da API Cloudflare; se ela ainda nao existir, usa exemplos locais.
async function carregarCandidatos() {
  candidatosPais = ordenarCandidatos(CANDIDATOS_EXEMPLO);
  renderizarCandidatos();

  try {
    const resposta = await fetch(endpoint("candidatos"), {
      method: "GET",
      cache: "no-store"
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok || !dados.ok || !Array.isArray(dados.candidatos)) {
      mostrarStatus("info", "Candidatos de teste carregados. Configure a API Cloudflare para carregar dados oficiais.");
      return;
    }

    if (dados.candidatos.length > 0) {
      candidatosPais = ordenarCandidatos(dados.candidatos.map(normalizarCandidato));
      renderizarCandidatos();
      mostrarStatus("success", "Candidatos carregados da API Cloudflare.");
      return;
    }

    mostrarStatus("info", "API sem candidatos cadastrados. Usando candidatos de teste.");
  } catch (error) {
    console.warn("API Cloudflare ainda indisponivel para candidatos. Usando candidatos locais.", error);
    mostrarStatus("info", "Candidatos de teste carregados. Configure a API Cloudflare para salvar votos.");
  }
}

function normalizarCandidato(candidato) {
  return {
    id: String(candidato.id || candidato.slug || candidato.nome || "").trim(),
    nome: candidato.nome || "Candidato sem nome",
    numero: candidato.numero || "",
    foto: candidato.foto || FOTO_PADRAO,
    ativo: candidato.ativo !== false,
    votos: Number(candidato.votos || 0)
  };
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

function renderizarCandidatos() {
  candidatosLoading.style.display = "none";
  candidatosLista.innerHTML = "";

  candidatosPais.forEach((candidato) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "candidato-card";
    card.dataset.candidatoId = candidato.id;
    card.setAttribute("aria-label", `Votar em ${candidato.nome}`);

    const foto = document.createElement("img");
    foto.src = candidato.foto || FOTO_PADRAO;
    foto.alt = `Foto de ${candidato.nome}`;
    foto.loading = "lazy";
    foto.addEventListener("error", () => {
      foto.src = FOTO_PADRAO;
    });

    const nome = document.createElement("span");
    nome.textContent = candidato.nome;

    card.appendChild(foto);
    card.appendChild(nome);
    card.addEventListener("click", () => selecionarCandidato(candidato.id));

    candidatosLista.appendChild(card);
  });

  setVotacaoBloqueada(votoBloqueado);
}

// Seleciona um candidato pelo card clicado e abre a confirmacao do voto.
function selecionarCandidato(candidatoId) {
  if (votoBloqueado) {
    return;
  }

  const candidato = candidatosPais.find((item) => item.id === candidatoId);

  if (!candidato) {
    mostrarStatus("error", "Selecione um candidato valido.");
    return;
  }

  candidatoSelecionado = candidato;
  abrirConfirmacao(candidato);
}

function abrirConfirmacao(candidato) {
  confirmFoto.src = candidato.foto || FOTO_PADRAO;
  confirmFoto.alt = `Foto de ${candidato.nome}`;
  confirmMessage.textContent = `Voce confirma seu voto em ${candidato.nome}?`;
  overlayConfirm.classList.add("active");
  btnConfirmarVoto.focus();
}

function cancelarSelecao() {
  candidatoSelecionado = null;
  overlayConfirm.classList.remove("active");
}

// Confirma o voto escolhido, valida o candidato e chama a API Cloudflare.
async function confirmarVoto() {
  if (!candidatoSelecionado) {
    overlayConfirm.classList.remove("active");
    mostrarStatus("error", "Nao e permitido votar sem candidato selecionado.");
    return;
  }

  setBotoesConfirmacaoBloqueados(true);

  try {
    await salvarVoto(candidatoSelecionado);
    finalizarVotacao();
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    mostrarStatus("error", "Nao foi possivel registrar o voto na API Cloudflare. Verifique o Worker/Pages Functions.");
  } finally {
    setBotoesConfirmacaoBloqueados(false);
    overlayConfirm.classList.remove("active");
  }
}

// Salva o voto de pais na API Cloudflare.
async function salvarVoto(candidato) {
  const resposta = await fetch(endpoint("votar"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      candidatoId: candidato.id,
      candidatoNome: candidato.nome,
      segmento: SEGMENTO
    })
  });
  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok || dados.ok === false) {
    throw new Error(dados.erro || "API_VOTO_ERRO");
  }
}

function finalizarVotacao() {
  tocarPlim();
  votoBloqueado = true;
  setVotacaoBloqueada(true);
  mostrarStatus("success", "Voto registrado com sucesso!");
  showScreen("fim");
  reiniciarUrnaDepoisDoFim();
}

// Mostra a tela FIM por alguns segundos e reinicia a urna para o proximo eleitor.
function reiniciarUrnaDepoisDoFim() {
  window.setTimeout(() => {
    window.location.reload();
  }, 4000);
}

function setVotacaoBloqueada(bloquear) {
  document.querySelectorAll(".candidato-card").forEach((card) => {
    card.disabled = bloquear;
    card.classList.toggle("bloqueado", bloquear);
  });
}

function setBotoesConfirmacaoBloqueados(bloquear) {
  btnConfirmarVoto.disabled = bloquear;
  btnCancelarVoto.disabled = bloquear;
  btnConfirmarVoto.textContent = bloquear ? "Registrando..." : "Confirmar voto";
}

function mostrarStatus(tipo, mensagem) {
  statusVotacao.className = `status-message visible ${tipo}`;
  statusVotacao.textContent = mensagem;
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

function tocarPlim() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (error) {
    // O som e opcional; alguns navegadores bloqueiam audio automatico.
  }
}
