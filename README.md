# ANDERSONSTUDIO — estúdio de tatuagem

Projeto acadêmico básico com página de apresentação, login/cadastro, controle de acesso, CRUD de agendamentos e banco SQLite.

## Requisitos
- Node.js instalado (versão LTS recomendada)
- VS Code

## Como executar
1. Extraia o ZIP e abra a pasta `studio_tattoo_modelo` no VS Code.
2. Abra o terminal do VS Code (**Terminal > Novo Terminal**).
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Acesse no navegador: http://localhost:3000

Não abra o `index.html` diretamente nem use Live Server: o sistema precisa do servidor Node.js para login e banco de dados.

## Acesso de administrador para demonstração
- E-mail: `admin@tatuagem.com`
- Senha: `Admin123!`

O banco `studio.db` será criado automaticamente na primeira execução.

## O que está implementado
- Landing page com apresentação do estúdio.
- Cadastro e login de usuários.
- Controle de acesso: usuário comum vê seus próprios agendamentos; administrador vê todos.
- CRUD de agendamentos (criar, listar, editar e excluir).
- Administrador pode atualizar o status dos agendamentos.
- Integração com banco de dados SQLite.
- Área administrativa com lista de contas cadastradas.

## Observações
Este é um modelo para estudo. Antes de publicar na internet, configure uma chave de sessão segura, HTTPS, validações adicionais, proteção contra tentativas repetidas de login e uma política de privacidade. A senha de administrador padrão deve ser alterada em um projeto real.

## Variáveis de ambiente (opcionais)
- `PORT` — porta do servidor (padrão 3000)
- `SESSION_SECRET` — chave das sessões (defina uma chave longa e aleatória em produção)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — conta de administrador criada na primeira execução
- `NODE_ENV=production` — ativa cookies seguros (requer HTTPS)
