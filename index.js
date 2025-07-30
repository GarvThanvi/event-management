import express from "express";
import 'dotenv/config'
import pool from './db.js';

const app = express();
const PORT = 8000;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});
