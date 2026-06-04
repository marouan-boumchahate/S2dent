#!/bin/bash
echo "=> Building S2dent API Docker image..."

docker compose down -v
docker compose up --build -d
docker compose exec blockchain npm run deploy:local
docker compose exec api npm run seed

echo "=> S2dent API Built Successfully!"
