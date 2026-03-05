const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  connectionTimeoutMillis: 5000,
});

app.get("/", (req, res) => {
  res.send("FibraDoc rodando 🚀");
});

app.get("/caixas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM caixas ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro /caixas:", err.message);
    res.status(500).json({ error: "Falha ao consultar o banco", detail: err.message });
  }
});

app.post("/caixas", async (req, res) => {
  try {
    const { nome, latitude, longitude } = req.body;
    const r = await pool.query(
      "INSERT INTO caixas (nome, latitude, longitude) VALUES ($1,$2,$3) RETURNING id",
      [nome, latitude, longitude]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    console.error("Erro POST /caixas:", err.message);
    res.status(500).json({ error: "Falha ao inserir no banco", detail: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
  console.log("DB_HOST=", process.env.DB_HOST, "DB_NAME=", process.env.DB_NAME, "DB_USER=", process.env.DB_USER);
});
