const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(path.join(__dirname, "studio.db"));
db.pragma("foreign_keys = ON");
const PORT = process.env.PORT || 3000;
const STATUS_VALIDOS = ["Pendente", "Confirmado", "Concluído", "Cancelado"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    tattoo_idea TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const adminEmail = (process.env.ADMIN_EMAIL || "admin@tatuagem.com").toLowerCase();
const adminSenha = process.env.ADMIN_PASSWORD || "Admin123!";
if (!db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail)) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
    .run("Administrador", adminEmail, bcrypt.hashSync(adminSenha, 10), "admin");
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

app.post("/api/register", limitarTentativas, (req, res) => {
  const name = texto(req.body.name, 80);
  const email = texto(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!name || !EMAIL_RE.test(email) || password.length < 6 || password.length > 100)
    return res.status(400).json({ erro: "Informe nome, e-mail válido e senha com pelo menos 6 caracteres." });
  try {
    const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')")
      .run(name, email, bcrypt.hashSync(password, 10));
    iniciarSessao(req, res, { id: result.lastInsertRowid, name, email, role: "user" });
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    console.error(e);
    res.status(500).json({ erro: "Erro interno ao criar a conta." });
  }
});

app.post("/api/login", limitarTentativas, (req, res) => {
  const email = texto(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  iniciarSessao(req, res, user);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => { res.clearCookie("connect.sid"); res.json({ ok: true }); });
});
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.get("/api/appointments", auth, (req, res) => {
  const admin = req.session.user.role === "admin";
  const base = `SELECT a.*, u.name AS account_name FROM appointments a JOIN users u ON u.id = a.user_id`;
  const rows = admin
    ? db.prepare(`${base} ORDER BY a.appointment_date, a.id`).all()
    : db.prepare(`${base} WHERE a.user_id = ? ORDER BY a.appointment_date, a.id`).all(req.session.user.id);
  res.json(rows);
});

app.post("/api/appointments", auth, (req, res) => {
  const client_name = texto(req.body.client_name, 80);
  const tattoo_idea = texto(req.body.tattoo_idea, 200);
  const appointment_date = req.body.appointment_date;
  if (!client_name || !tattoo_idea || !appointment_date)
    return res.status(400).json({ erro: "Preencha todos os campos." });
  if (!dataValida(appointment_date)) return res.status(400).json({ erro: "Data inválida." });
  const result = db.prepare(`INSERT INTO appointments (user_id, client_name, tattoo_idea, appointment_date)
    VALUES (?, ?, ?, ?)`).run(req.session.user.id, client_name, tattoo_idea, appointment_date);
  res.status(201).json(db.prepare("SELECT * FROM appointments WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/appointments/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!item) return res.status(404).json({ erro: "Agendamento não encontrado." });
  const admin = req.session.user.role === "admin";
  if (!admin && item.user_id !== req.session.user.id)
    return res.status(403).json({ erro: "Você não pode alterar este agendamento." });
  const client_name = texto(req.body.client_name, 80) || item.client_name;
  const tattoo_idea = texto(req.body.tattoo_idea, 200) || item.tattoo_idea;
  const appointment_date = req.body.appointment_date || item.appointment_date;
  if (!dataValida(appointment_date)) return res.status(400).json({ erro: "Data inválida." });
  let status = item.status;
  if (admin && req.body.status) {
    if (!STATUS_VALIDOS.includes(req.body.status)) return res.status(400).json({ erro: "Status inválido." });
    status = req.body.status;
  }
  db.prepare(`UPDATE appointments SET client_name = ?, tattoo_idea = ?, appointment_date = ?, status = ? WHERE id = ?`)
    .run(client_name, tattoo_idea, appointment_date, status, id);
  res.json(db.prepare("SELECT * FROM appointments WHERE id = ?").get(id));
});

app.delete("/api/appointments/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!item) return res.status(404).json({ erro: "Agendamento não encontrado." });
  if (req.session.user.role !== "admin" && item.user_id !== req.session.user.id)
    return res.status(403).json({ erro: "Você não pode excluir este agendamento." });
  db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/api/users", auth, adminOnly, (req, res) => {
  res.json(db.prepare("SELECT id, name, email, role FROM users ORDER BY name").all());
});

// JSON inválido e erros inesperados sempre respondem em JSON
app.use("/api", (req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "Requisição inválida." });
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(PORT, () => console.log(`ANDERSONSTUDIO rodando em http://localhost:${PORT}`));
