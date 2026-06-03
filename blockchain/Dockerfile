FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Hardhat node runs on 8545 by default
EXPOSE 8545

# Start the node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
