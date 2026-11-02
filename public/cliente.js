const $ = (id) => document.getElementById(id);

let usuarioAtual = null;
let agendamentos = [];

async function api(url, metodo = "GET", dados = null) {
    try {
        const opcoes = {
            method: metodo,
            headers: { "Content-Type": "application/json" }
        };

        if (dados) {
            opcoes.body = JSON.stringify(dados);
        }

        const resposta = await fetch(url, opcoes);
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || "Não foi possível concluir a operação.");
        }

        return resultado;
    } catch (erro) {
        throw erro;
    }
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

        $("inicio").querySelector("p").textContent =
            `Bem-vindo, ${usuarioAtual.name}!`;

        $("data").min = hojeISO();

        carregarAgendamentos();

    } catch (erro) {
        alert(erro.message);
        window.location.href = "index.html";
    }
}

async function carregarAgendamentos() {
    try {
        agendamentos = await api("/api/appointments");
        mostrarAgendamentos();
    } catch (erro) {
        alert(erro.message);
    }
}

function mostrarAgendamentos() {
    const lista = $("listaMeusAgendamentos");
    lista.replaceChildren();

    if (agendamentos.length === 0) {
        lista.textContent = "Você ainda não possui agendamentos.";
        return;
    }

    agendamentos.forEach(item => {
        const card = document.createElement("article");
        card.className = "item";

        const titulo = document.createElement("h3");
        titulo.textContent = item.client_name;

        const ideia = document.createElement("p");
        ideia.textContent = "Tatuagem: " + item.tattoo_idea;

        const data = document.createElement("p");
        data.textContent = "Data: " + formatarData(item.appointment_date);

        const status = document.createElement("p");
        status.textContent = "Status: " + item.status;

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.type = "button";
        btnEditar.addEventListener("click", () => editarAgendamento(item));

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Cancelar agendamento";
        btnExcluir.type = "button";
        btnExcluir.addEventListener("click", () => excluirAgendamento(item.id));

        card.append(
            titulo,
            ideia,
            data,
            status,
            btnEditar,
            btnExcluir
        );

        lista.appendChild(card);
    });
}

$("formAgendamento").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = $("data").value;
    const horario = $("horario").value;
    const descricao = $("descricao").value.trim();

    if (!data || !horario || !descricao) {
        alert("Preencha todos os campos.");
        return;
    }

    if (data < hojeISO()) {
        alert("Escolha uma data válida.");
        return;
    }

    const dados = {
        client_name: usuarioAtual.name,
        tattoo_idea: `${descricao} | Horário desejado: ${horario}`,
        appointment_date: data
    };

    try {
        await api("/api/appointments", "POST", dados);

        alert("Agendamento solicitado com sucesso!");

        $("formAgendamento").reset();
        $("data").min = hojeISO();

        await carregarAgendamentos();

    } catch (erro) {
        alert(erro.message);
    }
});

async function editarAgendamento(item) {
    const ideia = prompt("Descrição da tatuagem:", item.tattoo_idea);

    if (ideia === null) return;

    const data = prompt(
        "Nova data (AAAA-MM-DD):",
        item.appointment_date
    );

    if (data === null) return;

    if (!data || data < hojeISO()) {
        alert("Informe uma data válida.");
        return;
    }

    try {
        await api(`/api/appointments/${item.id}`, "PUT", {
            client_name: usuarioAtual.name,
            tattoo_idea: ideia,
            appointment_date: data
        });

        alert("Agendamento atualizado!");
        await carregarAgendamentos();

    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirAgendamento(id) {
    if (!confirm("Deseja realmente cancelar este agendamento?")) {
        return;
    }

    try {
        await api(`/api/appointments/${id}`, "DELETE");

        alert("Agendamento cancelado!");
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