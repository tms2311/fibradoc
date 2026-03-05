const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Servir frontend (mapa) em /app
app.use("/app", express.static(path.join(__dirname, "public")));

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  connectionTimeoutMillis: 5000,
});

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

app.get("/", (req, res) => res.send("FibraDoc rodando 🚀"));
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== Carregar tudo para o mapa (rápido) =====
app.get("/mapa", async (req, res) => {
  try {
    const [caixas, ctos, cabos, trechos] = await Promise.all([
      pool.query("SELECT * FROM caixas ORDER BY id DESC"),
      pool.query("SELECT * FROM ctos ORDER BY id DESC"),
      pool.query("SELECT * FROM cabos ORDER BY id DESC"),
      pool.query("SELECT * FROM trechos ORDER BY id DESC"),
    ]);
    res.json({
      caixas: caixas.rows,
      ctos: ctos.rows,
      cabos: cabos.rows,
      trechos: trechos.rows,
    });
  } catch (e) {
    console.error("Erro /mapa:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== CAIXAS =====
app.get("/caixas", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM caixas ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/caixas", async (req, res) => {
  try {
    const { codigo, nome, latitude, longitude, endereco, observacao } = req.body;
    const r = await pool.query(
      `INSERT INTO caixas (codigo, nome, latitude, longitude, endereco, observacao)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        codigo || null,
        nome || null,
        toNum(latitude),
        toNum(longitude),
        endereco || null,
        observacao || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("POST /caixas:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== CTOs =====
app.get("/ctos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ctos ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/ctos", async (req, res) => {
  try {
    const { codigo, nome, latitude, longitude, endereco, capacidade, observacao } = req.body;
    const r = await pool.query(
      `INSERT INTO ctos (codigo, nome, latitude, longitude, endereco, capacidade, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        codigo || null,
        nome || null,
        toNum(latitude),
        toNum(longitude),
        endereco || null,
        capacidade ? Number(capacidade) : 8,
        observacao || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("POST /ctos:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== CABOS =====
app.get("/cabos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM cabos ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/cabos", async (req, res) => {
  try {
    const { codigo, nome, tipo, fibras_total, observacao } = req.body;
    const r = await pool.query(
      `INSERT INTO cabos (codigo, nome, tipo, fibras_total, observacao)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        codigo || null,
        nome || null,
        tipo || "distribuicao",
        fibras_total ? Number(fibras_total) : 12,
        observacao || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("POST /cabos:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== TRECHOS (polilinha GeoJSON) =====
app.get("/trechos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM trechos ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/trechos", async (req, res) => {
  try {
    const { cabo_id, nome, de_tipo, de_id, para_tipo, para_id, geom_json, distancia_m, observacao } = req.body;

    if (!cabo_id) return res.status(400).json({ error: "cabo_id é obrigatório" });
    if (!geom_json) return res.status(400).json({ error: "geom_json é obrigatório (GeoJSON LineString)" });

    const r = await pool.query(
      `INSERT INTO trechos (cabo_id, nome, de_tipo, de_id, para_tipo, para_id, geom_json, distancia_m, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        Number(cabo_id),
        nome || null,
        de_tipo || null,
        de_id ? Number(de_id) : null,
        para_tipo || null,
        para_id ? Number(para_id) : null,
        geom_json,
        distancia_m ? Number(distancia_m) : null,
        observacao || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("POST /trechos:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== FUSÕES =====
app.get("/fusoes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM fusoes ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/fusoes", async (req, res) => {
  try {
    const {
      caixa_id,
      cabo_a_id, fibra_a, tubo_a,
      cabo_b_id, fibra_b, tubo_b,
      tipo, observacao
    } = req.body;

    const r = await pool.query(
      `INSERT INTO fusoes (caixa_id, cabo_a_id, fibra_a, tubo_a, cabo_b_id, fibra_b, tubo_b, tipo, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        Number(caixa_id),
        Number(cabo_a_id), Number(fibra_a), tubo_a ? Number(tubo_a) : null,
        Number(cabo_b_id), Number(fibra_b), tubo_b ? Number(tubo_b) : null,
        tipo || "fusao",
        observacao || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("POST /fusoes:", e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
