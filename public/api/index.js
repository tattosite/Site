const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");
const app = express();
let bancoPronto = false;
app.use(async (req, res, next) => {
  if (!bancoPronto) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user'
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          client_name TEXT NOT NULL,
          tattoo_idea TEXT NOT NULL,
          appointment_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Pendente',
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
      `);
      
      // Cria o admin padrão se não existir
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@tatuagem.com").toLowerCase();
      const adminSenha = process.env.ADMIN_PASSWORD || "Admin123!";
      const checaAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
      
      if (checaAdmin.rows.length === 0) {
        const hashSenha = require("bcryptjs").hashSync(adminSenha, 10);
        await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')",
          ["Administrador", adminEmail, hashSenha]
        );
      }
      
      bancoPronto = true;
    } catch (err) {
      console.error("Erro crítico ao criar tabelas no Neon:", err);
      return res.status(500).json({ erro: "Erro ao conectar com o banco de dados." });
    }
  }
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 3000;
const STATUS_VALIDOS = ["Pendente", "Confirmado", "Concluído", "Cancelado"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Função assíncrona para criar as tabelas e o administrador padrão no Neon
async function inicializarBanco() {
  try {
    // 1. Criação das tabelas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        tattoo_idea TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pendente',
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // 2. Configuração e checagem do Administrador Padrão
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@tatuagem.com").toLowerCase();
    const adminSenha = process.env.ADMIN_PASSWORD || "Admin123!";

    const usuarioExistente = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);

    if (usuarioExistente.rows.length === 0) {
      const hashSenha = bcrypt.hashSync(adminSenha, 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ["Administrador", adminEmail, hashSenha, "admin"]
      );
      console.log("Usuário administrador padrão criado com sucesso no Neon!");
    }
  } catch (erro) {
    console.error("Erro ao inicializar o banco de dados no Neon:", erro);
  }
}


app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'"
  });
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || "troque-esta-chave-em-producao",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, "public")));

// Limite simples de tentativas de login/cadastro por IP (em memória)
const tentativas = new Map();
function limitarTentativas(req, res, next) {
  const agora = Date.now(), janela = 15 * 60 * 1000, max = 20;
  const reg = tentativas.get(req.ip);
  if (!reg || agora - reg.inicio > janela) { tentativas.set(req.ip, { inicio: agora, n: 1 }); return next(); }
  if (++reg.n > max) return res.status(429).json({ erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  next();
}
setInterval(() => { const l = Date.now() - 15 * 60 * 1000; for (const [ip, r] of tentativas) if (r.inicio < l) tentativas.delete(ip); }, 10 * 60 * 1000).unref();

function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ erro: "Faça login para continuar." });
  next();
}
function adminOnly(req, res, next) {
  if (req.session.user?.role !== "admin") return res.status(403).json({ erro: "Acesso permitido apenas ao administrador." });
  next();
}
const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function dataValida(s) {
  if (typeof s !== "string" || !DATA_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function iniciarSessao(req, res, user) {
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ erro: "Erro ao iniciar sessão." });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ user: req.session.user });
  });
}

app.post("/api/register", limitarTentativas, async (req, res) => {
  const name = texto(req.body.name, 80);
  const email = texto(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name || !EMAIL_RE.test(email) || password.length < 6 || password.length > 100) {
    return res.status(400).json({ erro: "Informe nome, e-mail válido e senha com pelo menos 6 caracteres." });
  }

  try {
    const queryText = "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id";
    const values = [name, email, bcrypt.hashSync(password, 10)];
    
    const result = await pool.query(queryText, values);
    const novoId = result.rows[0].id;

    iniciarSessao(req, res, { id: novoId, name, email, role: "user" });

  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    }
    console.error(e);
    res.status(500).json({ erro: "Erro interno ao criar a conta." });
  }
});

app.post("/api/login", limitarTentativas, async (req, res) => {
  const email = texto(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    iniciarSessao(req, res, user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});


app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));


app.get("/api/appointments", auth, async (req, res) => {
  const admin = req.session.user.role === "admin";
  const base = `SELECT a.*, u.name AS account_name FROM appointments a JOIN users u ON u.id = a.user_id`;

  try {
    let result;
    if (admin) {
      result = await pool.query(`${base} ORDER BY a.appointment_date, a.id`);
    } else {
      result = await pool.query(`${base} WHERE a.user_id = $1 ORDER BY a.appointment_date, a.id`, [req.session.user.id]);
    }
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao listar agendamentos." });
  }
});


app.post("/api/appointments", auth, async (req, res) => {
  const client_name = texto(req.body.client_name, 80);
  const tattoo_idea = texto(req.body.tattoo_idea, 200);
  const appointment_date = req.body.appointment_date;

  if (!client_name || !tattoo_idea || !appointment_date) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }
  if (!dataValida(appointment_date)) {
    return res.status(400).json({ erro: "Data inválida." });
  }

  try {
    const queryText = `
      INSERT INTO appointments (user_id, client_name, tattoo_idea, appointment_date) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const values = [req.session.user.id, client_name, tattoo_idea, appointment_date];
    const result = await pool.query(queryText, values);
    
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao criar agendamento." });
  }
});


app.put("/api/appointments/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const itemResult = await pool.query("SELECT * FROM appointments WHERE id = $1", [id]);
    const item = itemResult.rows[0];

    if (!item) return res.status(404).json({ erro: "Agendamento não encontrado." });

    const admin = req.session.user.role === "admin";
    if (!admin && item.user_id !== req.session.user.id) {
      return res.status(403).json({ erro: "Você não pode alterar este agendamento." });
    }

    const client_name = texto(req.body.client_name, 80) || item.client_name;
    const tattoo_idea = texto(req.body.tattoo_idea, 200) || item.tattoo_idea;
    const appointment_date = req.body.appointment_date || item.appointment_date;

    if (!dataValida(appointment_date)) {
      return res.status(400).json({ erro: "Data inválida." });
    }

    let status = item.status;
    if (admin && req.body.status) {
      if (!STATUS_VALIDOS.includes(req.body.status)) {
        return res.status(400).json({ erro: "Status inválido." });
      }
      status = req.body.status;
    }

    const updateText = `
      UPDATE appointments 
      SET client_name = $1, tattoo_idea = $2, appointment_date = $3, status = $4 
      WHERE id = $5 RETURNING *
    `;
    const updateResult = await pool.query(updateText, [client_name, tattoo_idea, appointment_date, status, id]);
    
    res.json(updateResult.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao atualizar agendamento." });
  }
});


app.delete("/api/appointments/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const itemResult = await pool.query("SELECT * FROM appointments WHERE id = $1", [id]);
    const item = itemResult.rows[0];

    if (!item) return res.status(404).json({ erro: "Agendamento não encontrado." });

    if (req.session.user.role !== "admin" && item.user_id !== req.session.user.id) {
      return res.status(403).json({ erro: "Você não pode excluir este agendamento." });
    }

    await pool.query("DELETE FROM appointments WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao deletar agendamento." });
  }
});


app.get("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, role FROM users ORDER BY name");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao listar usuários." });
  }
});


app.use("/api", (req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "Requisição inválida." });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});


if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`ANDERSONSTUDIO rodando em http://localhost:${PORT}`));
}
module.exports = app;
