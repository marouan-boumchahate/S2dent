import pg from 'pg';
import { env } from './env.js';

const { Pool, Client } = pg;

// Create the database if it doesn't exist
// ───────────────────────────────────────
export const ensureDatabaseExists = async () => {
  const client = new Client({
    host:     env.db.host,
    port:     env.db.port,
    database: 'postgres', // Connect to default DB to check/create our target DB
    user:     env.db.user,
    password: env.db.password,
  });

  await client.connect();

  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [env.db.name]
  );

  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE "${env.db.name}"`);
    console.log(`=> Database "${env.db.name}" created\n`);
  } else {
    console.log(`=> Database "${env.db.name}" already exists\n`);
  }

  await client.end();
};

// Database connection pool
// ────────────────────────
const pool = new Pool({
  host:     env.db.host,
  port:     env.db.port,
  database: env.db.name,
  user:     env.db.user,
  password: env.db.password,
  ssl:      env.db.ssl ? { rejectUnauthorized: false } : false,

  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

pool.on('error', (err) => {
  console.error('(x) => Database connection error:', err.message);
  process.exit(1);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export default pool;