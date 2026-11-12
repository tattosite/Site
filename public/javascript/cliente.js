const $ = (id) => document.getElementById(id);

const SEPARADOR_HORARIO = " | Horário desejado: ";

let usuarioAtual = null;
let agendamentos = [];
let estilos = [];
let servicos = [];

async function api(url, metodo = "GET", dados = null) {
    const opcoes = {
        method: metodo,
        headers: { "Content-Type": "application/json" }
    };

    if (dados) {
        opcoes.body = JSON.stringify(dados);
    }

    const resposta = await fetch(url, opcoes);
    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(resultado.erro || "Não foi possível concluir a operação.");
    }

    return resultado;
}

async function verificarCliente() {
    try {
        const dados = await api("/api/me");

        if (!dados.user) {
            window.location.href = "index.html";
            return;
        }

        if (dados.user.role === "admin") {
            window.location.href = "admin.html";
            return;
        }

        usuarioAtual = dados.user;

        $("boasVindas").textContent = `Bem-vindo, ${usuarioAtual.name}!`;
        $("data").min = hojeISO();

        await carregarOpcoes();
        await carregarAgendamentos();
    } catch (erro) {
        alert(erro.message);
        window.location.href = "index.html";
    }
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function preencherSelect(select, itens, rotulo) {
    select.replaceChildren();

    const vazio = document.createElement("option");
    vazio.value = "";
    vazio.textContent = "Selecione...";
    select.appendChild(vazio);

    itens.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = rotulo(item);
        select.appendChild(option);
    });
}

async function carregarOpcoes() {
    estilos = await api("/api/styles");
    servicos = await api("/api/services");

    preencherSelect($("estilo"), estilos, e => e.name);
    preencherSelect($("servico"), servicos, s => `${s.name} - a partir de ${formatarPreco(s.base_price)}`);
}

async function carregarAgendamentos() {
    try {
        agendamentos = await api("/api/appointments");
        mostrarAgendamentos();
    } catch (erro) {
        alert(erro.message);
    }
}

function separarHorario(texto) {
    const indice = String(texto).lastIndexOf(SEPARADOR_HORARIO);
    if (indice === -1) return { descricao: String(texto), horario: "" };
    return {
        descricao: texto.slice(0, indice),
        horario: texto.slice(indice + SEPARADOR_HORARIO.length)
    };
}

function classeStatus(status) {
    return String(status).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function mostrarAgendamentos() {
    const lista = $("listaMeusAgendamentos");
    lista.replaceChildren();

    if (agendamentos.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "vazio";
        vazio.textContent = "Você ainda não possui agendamentos.";
        lista.appendChild(vazio);
        return;
    }

    agendamentos.forEach(item => {
        const { descricao, horario } = separarHorario(item.tattoo_idea);

        const card = document.createElement("article");
        card.className = "item";

        const titulo = document.createElement("h3");
        titulo.textContent = formatarData(item.appointment_date) + (horario ? " às " + horario : "");

        const ideia = document.createElement("p");
        ideia.textContent = "Tatuagem: " + descricao;

        const detalhes = document.createElement("p");
        const partes = [];
        if (item.style_name) partes.push("Estilo: " + item.style_name);
        if (item.service_name) {
            partes.push("Serviço: " + item.service_name + " (a partir de " + formatarPreco(item.base_price) + ")");
        }
        detalhes.textContent = partes.join(" • ");

        const status = document.createElement("p");
        status.textContent = "Status: ";
        const selo = document.createElement("span");
        selo.className = "selo " + classeStatus(item.status);
        selo.textContent = item.status;
        status.appendChild(selo);

        const acoes = document.createElement("div");
        acoes.className = "acoes";

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.type = "button";
        btnEditar.className = "btn btn-outline";
        btnEditar.addEventListener("click", () => iniciarEdicao(item));

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Excluir";
        btnExcluir.type = "button";
        btnExcluir.className = "btn btn-perigo";
        btnExcluir.addEventListener("click", () => excluirAgendamento(item.id));

        acoes.append(btnEditar, btnExcluir);
        card.append(titulo, ideia);
        if (partes.length) card.append(detalhes);
        card.append(status, acoes);
        lista.appendChild(card);
    });
}

function iniciarEdicao(item) {
    const { descricao, horario } = separarHorario(item.tattoo_idea);

    $("agendamentoId").value = item.id;
    $("data").min = "";
    $("data").value = item.appointment_date;
    $("horario").value = horario;
    $("estilo").value = item.style_id || "";
    $("servico").value = item.service_id || "";
    $("descricao").value = descricao;

    $("tituloForm").textContent = "Editar Agendamento";
    $("btnSalvar").textContent = "Salvar alterações";
    $("barraEdicao").classList.remove("oculto");

    $("novoAgendamento").scrollIntoView({ behavior: "smooth" });
    $("descricao").focus();
}

function sairDoModoEdicao() {
    $("formAgendamento").reset();
    $("agendamentoId").value = "";
    $("data").min = hojeISO();
    $("tituloForm").textContent = "Novo Agendamento";
    $("btnSalvar").textContent = "Solicitar Agendamento";
    $("barraEdicao").classList.add("oculto");
}

$("btnCancelarEdicao").addEventListener("click", sairDoModoEdicao);

$("formAgendamento").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = $("agendamentoId").value;
    const data = $("data").value;
    const horario = $("horario").value;
    const descricao = $("descricao").value.trim();
    const estilo = $("estilo").value;
    const servico = $("servico").value;

    if (!data || !horario || !descricao || !estilo || !servico) {
        alert("Preencha todos os campos.");
        return;
    }

    if (data < hojeISO()) {
        alert("Escolha uma data válida.");
        return;
    }

    const dados = {
        client_name: usuarioAtual.name,
        tattoo_idea: `${descricao}${SEPARADOR_HORARIO}${horario}`,
        appointment_date: data,
        style_id: Number(estilo),
        service_id: Number(servico)
    };

    const botao = $("btnSalvar");
    botao.disabled = true;

    try {
        if (id) {
            await api(`/api/appointments/${id}`, "PUT", dados);
            alert("Agendamento atualizado!");
        } else {
            await api("/api/appointments", "POST", dados);
            alert("Agendamento solicitado com sucesso!");
        }

        sairDoModoEdicao();
        await carregarAgendamentos();
        $("meusAgendamentos").scrollIntoView({ behavior: "smooth" });
    } catch (erro) {
        alert(erro.message);
    } finally {
        botao.disabled = false;
    }
});

async function excluirAgendamento(id) {
    if (!confirm("Deseja realmente excluir este agendamento?")) {
        return;
    }

    try {
        await api(`/api/appointments/${id}`, "DELETE");

        if ($("agendamentoId").value === String(id)) {
            sairDoModoEdicao();
        }

        alert("Agendamento excluído!");
        await carregarAgendamentos();
    } catch (erro) {
        alert(erro.message);
    }
}

function hojeISO() {
    const data = new Date();
    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    return data.toISOString().slice(0, 10);
}

function formatarData(data) {
    const partes = String(data).split("-");

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : data;
}

$("btnSair").addEventListener("click", async () => {
    try {
        await api("/api/logout", "POST", {});
        window.location.href = "index.html";
    } catch (erro) {
        alert(erro.message);
    }
});

verificarCliente();
