import app from './src/app.js';
import { env } from './src/config/env.js';
import { ensureDatabaseExists } from './src/config/db.js';
import { runMigrations } from './src/db/migrate.js';
import http from 'http';
import { initSocket } from './src/config/socket.js';
import { startNonceCleanupJob } from './src/jobs/nonceCleanup.js';
import { startCredentialCleanupJob } from './src/jobs/credentialCleanup.js';

const bootstrap = async () => {
  try {
    await ensureDatabaseExists();

    await runMigrations();

    startNonceCleanupJob();
    startCredentialCleanupJob();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const PORT = env.port;
    httpServer.listen(PORT, () => {
      console.log(`\nApp is listening on port ${PORT} : http://localhost:${PORT}`)
    });

  } catch (err) {
    console.error('=> Failed to start server:', err.message);
    process.exit(1);
  }
};

bootstrap();