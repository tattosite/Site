const $ = (id) => document.getElementById(id);

let agendamentos = [];
let usuarios = [];

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

async function verificarAdministrador() {
    try {
        const dados = await api("/api/me");

        if (!dados.user) {
            window.location.href = "cliente.html";
            return;
        }

        if (dados.user.role !== "admin") {
            alert("Acesso permitido apenas ao administrador.");
            window.location.href = "cliente.html";
            return;
        }

        carregarDados();
    } catch (erro) {
        alert(erro.message);
        window.location.href = "index.html";
    }
}

async function carregarDados() {
    try {
        agendamentos = await api("/api/appointments");
        usuarios = await api("/api/users");

        mostrarAgendamentos();
        mostrarClientes();
        atualizarResumo();
    } catch (erro) {
        alert(erro.message);
    }
}

function atualizarResumo() {
    $("totalAgendamentos").textContent = agendamentos.length;

    $("agendamentosPendentes").textContent =
        agendamentos.filter(a => a.status === "Pendente").length;

    $("agendamentosConcluidos").textContent =
        agendamentos.filter(a => a.status === "Concluído").length;

    $("totalClientes").textContent =
        usuarios.filter(u => u.role === "user").length;
}

function mostrarAgendamentos() {
    const lista = $("listaAgendamentos");
    lista.replaceChildren();

    if (agendamentos.length === 0) {
        lista.textContent = "Nenhum agendamento cadastrado.";
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

        const conta = document.createElement("p");
        conta.textContent = "Conta: " + item.account_name;

        const status = document.createElement("select");

        ["Pendente", "Confirmado", "Concluído", "Cancelado"].forEach(opcao => {
            const option = document.createElement("option");
            option.value = opcao;
            option.textContent = opcao;
            status.appendChild(option);
        });

        status.value = item.status;

        const btnStatus = document.createElement("button");
        btnStatus.textContent = "Atualizar status";
        btnStatus.type = "button";
        btnStatus.addEventListener("click", () => alterarStatus(item, status.value));

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.type = "button";
        btnEditar.addEventListener("click", () => editarAgendamento(item));

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Excluir";
        btnExcluir.type = "button";
        btnExcluir.addEventListener("click", () => excluirAgendamento(item.id));

        card.append(
            titulo,
            ideia,
            data,
            conta,
            document.createTextNode("Status: "),
            status,
            btnStatus,
            btnEditar,
            btnExcluir
        );

        lista.appendChild(card);
    });
}

async function alterarStatus(item, novoStatus) {
    try {
        await api(`/api/appointments/${item.id}`, "PUT", {
            status: novoStatus
        });

        alert("Status atualizado!");
        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
}

async function editarAgendamento(item) {
    const nome = prompt("Nome do cliente:", item.client_name);
    if (nome === null) return;

    const ideia = prompt("Descrição da tatuagem:", item.tattoo_idea);
    if (ideia === null) return;

    const data = prompt("Data (AAAA-MM-DD):", item.appointment_date);
    if (data === null) return;

    try {
        await api(`/api/appointments/${item.id}`, "PUT", {
            client_name: nome,
            tattoo_idea: ideia,
            appointment_date: data
        });

        alert("Agendamento atualizado!");
        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirAgendamento(id) {
    if (!confirm("Deseja realmente excluir este agendamento?")) {
        return;
    }

    try {
        await api(`/api/appointments/${id}`, "DELETE");
        alert("Agendamento excluído!");
        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
}

function mostrarClientes() {
    const lista = $("listaClientes");
    lista.replaceChildren();

    const clientes = usuarios.filter(u => u.role === "user");

    if (clientes.length === 0) {
        lista.textContent = "Nenhum cliente cadastrado.";
        return;
    }

    clientes.forEach(usuario => {
        const card = document.createElement("div");
        card.className = "item";

        const nome = document.createElement("p");
        nome.textContent = "Nome: " + usuario.name;

        const email = document.createElement("p");
        email.textContent = "E-mail: " + usuario.email;

        card.append(nome, email);
        lista.appendChild(card);
    });
}

$("buscarAgendamento").addEventListener("input", (e) => {
    const pesquisa = e.target.value.toLowerCase();

    document.querySelectorAll("#listaAgendamentos .item").forEach(card => {
        card.hidden = !card.textContent.toLowerCase().includes(pesquisa);
    });
});

$("buscarCliente").addEventListener("input", (e) => {
    const pesquisa = e.target.value.toLowerCase();

    document.querySelectorAll("#listaClientes .item").forEach(card => {
        card.hidden = !card.textContent.toLowerCase().includes(pesquisa);
    });
});

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

verificarAdministrador();