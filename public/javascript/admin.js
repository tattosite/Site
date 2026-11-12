const $ = (id) => document.getElementById(id);

const STATUS = ["Pendente", "Confirmado", "Concluído", "Cancelado"];

let agendamentos = [];
let usuarios = [];
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

async function verificarAdministrador() {
    try {
        const dados = await api("/api/me");

        if (!dados.user) {
            window.location.href = "index.html";
            return;
        }

        if (dados.user.role !== "admin") {
            alert("Acesso permitido apenas ao administrador.");
            window.location.href = "cliente.html";
            return;
        }

        await carregarDados();
    } catch (erro) {
        alert(erro.message);
        window.location.href = "index.html";
    }
}

async function carregarDados() {
    try {
        agendamentos = await api("/api/appointments");
        usuarios = await api("/api/users");
        estilos = await api("/api/styles");
        servicos = await api("/api/services");

        mostrarAgendamentos();
        mostrarClientes();
        atualizarResumo();
        aplicarBusca("buscarAgendamento", "listaAgendamentos");
        aplicarBusca("buscarCliente", "listaClientes");
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

function classeStatus(status) {
    return String(status).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function mostrarVazio(lista, texto) {
    const p = document.createElement("p");
    p.className = "vazio";
    p.textContent = texto;
    lista.appendChild(p);
}

function mostrarAgendamentos() {
    const lista = $("listaAgendamentos");
    lista.replaceChildren();

    if (agendamentos.length === 0) {
        mostrarVazio(lista, "Nenhum agendamento cadastrado.");
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
        conta.textContent = "Conta: " + (item.account_name || "-");

        const detalhes = document.createElement("p");
        detalhes.textContent =
            "Estilo: " + (item.style_name || "não informado") +
            " • Serviço: " + (item.service_name
                ? `${item.service_name} (a partir de ${formatarPreco(item.base_price)})`
                : "não informado");

        const status = document.createElement("p");
        status.textContent = "Status: ";
        const selo = document.createElement("span");
        selo.className = "selo " + classeStatus(item.status);
        selo.textContent = item.status;
        status.appendChild(selo);

        const acoes = document.createElement("div");
        acoes.className = "acoes";

        const select = document.createElement("select");
        select.setAttribute("aria-label", "Novo status");
        STATUS.forEach(opcao => {
            const option = document.createElement("option");
            option.value = opcao;
            option.textContent = opcao;
            select.appendChild(option);
        });
        select.value = item.status;

        const btnStatus = document.createElement("button");
        btnStatus.textContent = "Atualizar status";
        btnStatus.type = "button";
        btnStatus.className = "btn";
        btnStatus.addEventListener("click", () => alterarStatus(item, select.value));

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.type = "button";
        btnEditar.className = "btn btn-outline";
        btnEditar.addEventListener("click", () => abrirEdicao(item));

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Excluir";
        btnExcluir.type = "button";
        btnExcluir.className = "btn btn-perigo";
        btnExcluir.addEventListener("click", () => excluirAgendamento(item.id));

        acoes.append(select, btnStatus, btnEditar, btnExcluir);
        card.append(titulo, ideia, detalhes, data, conta, status, acoes);
        lista.appendChild(card);
    });
}

async function alterarStatus(item, novoStatus) {
    try {
        await api(`/api/appointments/${item.id}`, "PUT", {
            client_name: item.client_name,
            tattoo_idea: item.tattoo_idea,
            appointment_date: item.appointment_date,
            style_id: item.style_id,
            service_id: item.service_id,
            status: novoStatus
        });

        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function preencherSelect(select, itens, rotulo, valorAtual) {
    select.replaceChildren();

    const vazio = document.createElement("option");
    vazio.value = "";
    vazio.textContent = "Não informado";
    select.appendChild(vazio);

    itens.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = rotulo(item);
        select.appendChild(option);
    });

    select.value = valorAtual || "";
}

function abrirEdicao(item) {
    preencherSelect($("editarEstilo"), estilos, e => e.name, item.style_id);
    preencherSelect($("editarServico"), servicos, s => `${s.name} - ${formatarPreco(s.base_price)}`, item.service_id);

    $("editarId").value = item.id;
    $("editarNome").value = item.client_name;
    $("editarIdeia").value = item.tattoo_idea;
    $("editarData").value = item.appointment_date;
    $("editarStatus").value = item.status;
    $("dialogEditar").showModal();
}

$("btnFecharEditar").addEventListener("click", () => $("dialogEditar").close());

$("formEditar").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = $("editarId").value;
    const dados = {
        client_name: $("editarNome").value.trim(),
        tattoo_idea: $("editarIdeia").value.trim(),
        appointment_date: $("editarData").value,
        style_id: $("editarEstilo").value ? Number($("editarEstilo").value) : null,
        service_id: $("editarServico").value ? Number($("editarServico").value) : null,
        status: $("editarStatus").value
    };

    if (!dados.client_name || !dados.tattoo_idea || !dados.appointment_date) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        await api(`/api/appointments/${id}`, "PUT", dados);
        $("dialogEditar").close();
        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
});

async function excluirAgendamento(id) {
    if (!confirm("Deseja realmente excluir este agendamento?")) {
        return;
    }

    try {
        await api(`/api/appointments/${id}`, "DELETE");
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
        mostrarVazio(lista, "Nenhum cliente cadastrado.");
        return;
    }

    clientes.forEach(usuario => {
        const card = document.createElement("article");
        card.className = "item";

        const nome = document.createElement("h3");
        nome.textContent = usuario.name;

        const email = document.createElement("p");
        email.textContent = "E-mail: " + usuario.email;

        const qtd = agendamentos.filter(a => a.user_id === usuario.id).length;
        const total = document.createElement("p");
        total.textContent = "Agendamentos: " + qtd;

        const acoes = document.createElement("div");
        acoes.className = "acoes";

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Excluir conta";
        btnExcluir.type = "button";
        btnExcluir.className = "btn btn-perigo";
        btnExcluir.addEventListener("click", () => excluirCliente(usuario));

        acoes.appendChild(btnExcluir);
        card.append(nome, email, total, acoes);
        lista.appendChild(card);
    });
}

async function excluirCliente(usuario) {
    const aviso = `Excluir a conta de "${usuario.name}"?\n\nOs agendamentos desse cliente também serão removidos. Essa ação não pode ser desfeita.`;
    if (!confirm(aviso)) {
        return;
    }

    try {
        await api(`/api/users/${usuario.id}`, "DELETE");
        await carregarDados();
    } catch (erro) {
        alert(erro.message);
    }
}

function aplicarBusca(idCampo, idLista) {
    const pesquisa = $(idCampo).value.toLowerCase();

    document.querySelectorAll(`#${idLista} .item`).forEach(card => {
        card.hidden = !card.textContent.toLowerCase().includes(pesquisa);
    });
}

$("buscarAgendamento").addEventListener("input", () => aplicarBusca("buscarAgendamento", "listaAgendamentos"));
$("buscarCliente").addEventListener("input", () => aplicarBusca("buscarCliente", "listaClientes"));

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
