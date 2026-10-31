const $ = (id) => document.getElementById(id);
let telaAuth = "login";
let usuarioAtual = null;

$("ano").textContent = new Date().getFullYear();

// ---------- Menu mobile ----------
const menu = $("menu"), toggle = $("menu-toggle");
function fecharMenu() {
  menu.classList.remove("aberto");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Abrir menu");
}
toggle.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  toggle.setAttribute("aria-expanded", String(aberto));
  toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
});
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", fecharMenu));

// ---------- Abas entrar / criar conta ----------
document.querySelectorAll(".aba").forEach(btn => btn.addEventListener("click", () => {
  telaAuth = btn.dataset.tela;
  document.querySelectorAll(".aba").forEach(b => {
    b.classList.toggle("ativa", b === btn);
    b.setAttribute("aria-selected", String(b === btn));
  });
  const cadastro = telaAuth === "cadastro";
  $("nome-label").classList.toggle("oculto", !cadastro);
  $("nome").required = cadastro;
  $("auth-submit").textContent = cadastro ? "Criar conta" : "Entrar";
  $("senha").autocomplete = cadastro ? "new-password" : "current-password";
  $("auth-erro").textContent = "";
}));

// ---------- Login / cadastro ----------
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("auth-erro");
  erro.textContent = "";
  const email = $("email").value.trim();
  const senha = $("senha").value;
  const nome = $("nome").value.trim();
  if (telaAuth === "cadastro" && !nome) return (erro.textContent = "Informe seu nome.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return (erro.textContent = "Informe um e-mail válido.");
  if (senha.length < 6) return (erro.textContent = "A senha deve ter pelo menos 6 caracteres.");

  const dados = { email, password: senha };
  if (telaAuth === "cadastro") dados.name = nome;
  const botao = $("auth-submit");
  botao.disabled = true;
  const resultado = await api(telaAuth === "login" ? "/api/login" : "/api/register", "POST", dados);
  botao.disabled = false;
  if (resultado.erro) return (erro.textContent = resultado.erro);
  usuarioAtual = resultado.user;
  $("auth-form").reset();
  mostrarPainel();
});

$("sair").addEventListener("click", async () => {
  await api("/api/logout", "POST", {});
  usuarioAtual = null;
  $("dashboard").classList.add("oculto");
  $("auth-area").classList.remove("oculto");
  $("mensagem").textContent = "";
  limparFormulario();
});

// ---------- Agendamentos ----------
$("agendamento-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("agendamento-id").value;
  const dados = {
    client_name: $("cliente").value.trim(),
    tattoo_idea: $("ideia").value.trim(),
    appointment_date: $("data").value,
    status: $("status").value
  };
  if (!dados.client_name || !dados.tattoo_idea) { $("mensagem").textContent = "Preencha todos os campos."; return; }
  const botao = $("salvar-agendamento");
  botao.disabled = true;
  const resultado = await api(id ? `/api/appointments/${id}` : "/api/appointments", id ? "PUT" : "POST", dados);
  botao.disabled = false;
  if (resultado.erro) { $("mensagem").textContent = resultado.erro; return; }
  $("mensagem").textContent = id ? "Agendamento atualizado!" : "Agendamento cadastrado!";
  limparFormulario();
  await carregarAgendamentos();
});
$("cancelar-edicao").addEventListener("click", () => { limparFormulario(); $("mensagem").textContent = ""; });

async function api(url, metodo = "GET", dados) {
  try {
    const opcoes = { method: metodo, headers: { "Content-Type": "application/json" } };
    if (dados) opcoes.body = JSON.stringify(dados);
    const resposta = await fetch(url, opcoes);
    const json = await resposta.json().catch(() => null);
    if (!json) {
      const aviso = location.port === "3000" ? "" : " Abra o site por http://localhost:3000 (não use Live Server ou o arquivo direto).";
      return { erro: `O servidor não respondeu corretamente (código ${resposta.status}).${aviso} Confirme que o comando "npm start" está rodando.` };
    }
    if (!resposta.ok && !json.erro) json.erro = "Não foi possível concluir a operação.";
    return json;
  } catch {
    return { erro: "Não foi possível conectar ao servidor. Verifique se ele está iniciado." };
  }
}

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function formatarData(iso) {
  const [a, m, d] = String(iso).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

async function iniciar() {
  const dados = await api("/api/me");
  if (dados.user) { usuarioAtual = dados.user; mostrarPainel(); }
}
async function mostrarPainel() {
  $("auth-area").classList.add("oculto");
  $("dashboard").classList.remove("oculto");
  $("boas-vindas").textContent = `Olá, ${usuarioAtual.name}!`;
  const admin = usuarioAtual.role === "admin";
  $("tipo-conta").textContent = admin ? "Administrador: você pode gerenciar todos os agendamentos." : "Sua área para cadastrar e acompanhar pedidos.";
  $("status-label").classList.toggle("oculto", !admin);
  $("usuarios-area").classList.toggle("oculto", !admin);
  $("data").min = hojeISO();
  if (!$("cliente").value) $("cliente").value = usuarioAtual.name;
  await carregarAgendamentos();
  if (admin) await carregarUsuarios();
}
async function carregarAgendamentos() {
  const lista = $("lista-agendamentos");
  const dados = await api("/api/appointments");
  if (dados.erro) { lista.textContent = dados.erro; return; }
  lista.replaceChildren();
  if (!dados.length) { lista.textContent = "Nenhum agendamento cadastrado."; return; }
  dados.forEach(item => {
    const card = document.createElement("article");
    card.className = "item";
    const titulo = document.createElement("h4");
    titulo.textContent = item.client_name;
    const selo = document.createElement("span");
    selo.className = "selo " + item.status.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    selo.textContent = item.status;
    titulo.append(selo);
    const detalhe = document.createElement("p");
    detalhe.textContent = `Ideia: ${item.tattoo_idea}`;
    const data = document.createElement("p");
    data.textContent = `Data: ${formatarData(item.appointment_date)}`;
    card.append(titulo, detalhe, data);
    if (usuarioAtual.role === "admin") {
      const dono = document.createElement("p");
      dono.textContent = `Conta: ${item.account_name}`;
      card.append(dono);
    }
    const acoes = document.createElement("div");
    acoes.className = "acoes";
    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "btn btn-outline";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => editarAgendamento(item));
    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "btn";
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => excluirAgendamento(item.id));
    acoes.append(editar, excluir);
    card.append(acoes);
    lista.append(card);
  });
}
function editarAgendamento(item) {
  $("agendamento-id").value = item.id;
  $("cliente").value = item.client_name;
  $("ideia").value = item.tattoo_idea;
  $("data").min = "";
  $("data").value = item.appointment_date;
  $("status").value = item.status;
  $("form-titulo").textContent = "Editar agendamento";
  $("salvar-agendamento").textContent = "Salvar alterações";
  $("cancelar-edicao").classList.remove("oculto");
  $("agendamento-form").scrollIntoView({ behavior: "smooth", block: "center" });
}
async function excluirAgendamento(id) {
  if (!confirm("Deseja realmente excluir este agendamento?")) return;
  const resultado = await api(`/api/appointments/${id}`, "DELETE");
  if (resultado.erro) { $("mensagem").textContent = resultado.erro; return; }
  if ($("agendamento-id").value === String(id)) limparFormulario();
  $("mensagem").textContent = "Agendamento excluído.";
  await carregarAgendamentos();
}
function limparFormulario() {
  $("agendamento-form").reset();
  $("agendamento-id").value = "";
  $("data").min = hojeISO();
  if (usuarioAtual) $("cliente").value = usuarioAtual.name;
  $("form-titulo").textContent = "Novo agendamento";
  $("salvar-agendamento").textContent = "Salvar agendamento";
  $("cancelar-edicao").classList.add("oculto");
}
async function carregarUsuarios() {
  const dados = await api("/api/users");
  if (dados.erro) return;
  const lista = $("lista-usuarios");
  lista.replaceChildren();
  dados.forEach(u => {
    const p = document.createElement("p");
    p.className = "item";
    p.textContent = `${u.name} — ${u.email} (${u.role === "admin" ? "administrador" : "cliente"})`;
    lista.append(p);
  });
}
iniciar();
