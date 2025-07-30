import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB,
});

pool
  .connect()
  .then((client) => {
    console.log("Connected to DB");
    client.release();
  })
  .catch((err) => console.error("Error coccecting to database!", err));

export default pool;
