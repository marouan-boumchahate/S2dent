import app from './src/app.js';
import { env } from './src/config/env.js';
import { ensureDatabaseExists } from './src/config/db.js';
import { runMigrations } from './src/db/migrate.js';

const bootstrap = async () => {
  try {
    await ensureDatabaseExists();

    await runMigrations();

    const PORT = env.port;
    app.listen(PORT, () => {
      console.log(`\nApp is listening on port ${PORT} : http://localhost:${PORT}`)
    });

  } catch (err) {
    console.error('=> Failed to start server:', err.message);
    process.exit(1);
  }
};

bootstrap();