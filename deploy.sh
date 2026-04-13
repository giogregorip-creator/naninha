#!/bin/bash
# deploy.sh — Naninha no Hostinger VPS
# Rode uma vez para configurar, depois só rode para atualizar

set -e

echo "=== Naninha Deploy ==="

# 1. Build do frontend
echo "Build frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Instala dependencias do backend
echo "Instalando dependencias backend..."
cd backend
npm install --production
cd ..

# 3. Configura PM2 (se não estiver rodando)
if ! pm2 list | grep -q "naninha"; then
  echo "Iniciando com PM2..."
  pm2 start backend/server.js --name naninha
  pm2 save
  pm2 startup
else
  echo "Reiniciando PM2..."
  pm2 restart naninha
fi

echo ""
echo "=== Deploy concluido! ==="
echo "Variaveis de ambiente necessarias em .env:"
echo "  ANTHROPIC_API_KEY=sua_chave_aqui"
echo "  JWT_SECRET=uma_string_aleatoria_longa"
echo "  PORT=3000"
echo "  DB_PATH=/home/usuario/naninha.db"
