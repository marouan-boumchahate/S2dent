import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');


const ensureMigrationsTrackerExists = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id         SERIAL PRIMARY KEY,
            filename   VARCHAR(255) UNIQUE NOT NULL,
            ran_at     TIMESTAMP DEFAULT NOW()
        )
    `);
};

const getAllMigrations = () =>  {
    const files = fs.readdirSync(MIGRATIONS_DIR)
                    .filter(f => f.endsWith('.sql'))
                    .sort();

    return files;
}

const isMigrationAlreadyRun = async (client, filename) => {
    const result = await client.query(
        `SELECT 1 FROM _migrations WHERE filename = $1`,
        [filename]
    );

    return result.rowCount > 0;
}

const runMigrationFile = async (client, filename) => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    await client.query(sql);
}

const storeMigrationTracker = async (client, filename) => {
    await client.query(
        `INSERT INTO _migrations (filename) VALUES ($1)`,
        [filename]
    );
}

export const runMigrations = async () => {
    const client = await pool.connect();

    try {
        await ensureMigrationsTrackerExists(client);

        const files = getAllMigrations();

        for (const file of files) {
            const already = await isMigrationAlreadyRun(client, file);
            if (already) {
                console.log(`=> Skipping (already ran): ${file}`);
                continue;
            }

            console.log(`=> Running migration: ${file} ...`);
            
            await runMigrationFile(client, file);
            await storeMigrationTracker(client, file);

            console.log(`==> Done: ${file}\n`);
        }
    } catch (err) {
        console.error('=> Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
    }
};