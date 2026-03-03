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
});

app.get("/", (req, res) => {
  res.send("FibraDoc rodando 🚀");
});

app.get("/caixas", async (req, res) => {
  const result = await pool.query("SELECT * FROM caixas");
  res.json(result.rows);
});

app.post("/caixas", async (req, res) => {
  const { nome, latitude, longitude } = req.body;
  await pool.query(
    "INSERT INTO caixas (nome, latitude, longitude) VALUES ($1,$2,$3)",
    [nome, latitude, longitude]
  );
  res.send("Caixa cadastrada");
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
