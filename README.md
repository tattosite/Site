<h1 align="center">KROMA STUDIO</h1>

<p align="center">
  Site de agendamento para um estúdio de tatuagem.<br>
  O cliente pede um horário, o estúdio gerencia tudo em um painel.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
</p>

---

## Funcionalidades

<table>
  <tr>
    <th width="50%">Cliente</th>
    <th width="50%">Administrador</th>
  </tr>
  <tr>
    <td valign="top">
      • Criar conta e entrar<br>
      • Agendar com data, horário, estilo e serviço<br>
      • Editar e excluir os próprios agendamentos<br>
      • Acompanhar o status do pedido
    </td>
    <td valign="top">
      • Ver o resumo dos agendamentos<br>
      • Editar, mudar o status e excluir agendamentos<br>
      • Buscar agendamentos e clientes<br>
      • Excluir contas de clientes
    </td>
  </tr>
</table>

## Tecnologias

**No navegador (front-end)**
- **HTML:** estrutura das páginas (formulários, listas, menus).
- **CSS:** visual, com cores, grades e adaptação ao celular.
- **JavaScript:** busca os dados no servidor, monta os cards na tela e cuida de editar, excluir e filtrar.

**No servidor (back-end)**
- **Node.js com Express:** recebe os pedidos do site, confere quem está logado e responde com os dados.
- **bcrypt:** guarda as senhas de forma que ninguém consegue ler.
- **Sessões por cookie:** mantêm a pessoa logada por 8 horas.

**No banco de dados**
- **SQL (PostgreSQL no Neon):** guarda usuários, agendamentos, estilos e serviços em tabelas ligadas entre si.

**Na publicação**
- **GitHub:** guarda o código.
- **Vercel:** coloca o site no ar.

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um arquivo `.env` com:
   ```env
   DATABASE_URL=endereço-do-seu-banco-postgres
   SESSION_SECRET=uma-chave-secreta
   ADMIN_EMAIL=email-do-admin
   ADMIN_PASSWORD=senha-do-admin
   ```
3. Inicie:
   ```bash
   npm start
   ```
4. Acesse `http://localhost:3000`.

As tabelas e a conta de administrador são criadas automaticamente na primeira execução.

## Acesso de administrador (teste)

| | |
|---|---|
| **E-mail** | `admin@tatuagem.com` |
| **Senha** | `Admin123!` |

Esses são os valores padrão, usados quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` não estão definidos.

## Estrutura

```
api/index.js     servidor e API
public/          páginas, estilos e scripts
tatto.sql        estrutura do banco
```
