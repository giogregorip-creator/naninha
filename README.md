# Naninha — naninha.app

Diario digital do bebe com acesso separado para familia, baba e pediatra.
Relatorios semanais gerados por IA com analise de alimentacao, sono e crescimento.

## Perfis de acesso

| Perfil | O que faz |
|---|---|
| Familia | Cadastra o bebe, convida baba e pediatra, ve diario, historico, relatorios |
| Baba | Preenche o diario diario (alimentacao, sono, fralda, humor, sintomas) |
| Pediatra | Ve diario e historico de todos os pacientes, registra consultas e medicoes |

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco: SQLite (arquivo local)
- IA: Claude API (Anthropic)
- Auth: JWT

## Estrutura

```
naninha/
├── frontend/src/
│   ├── pages/
│   │   ├── AuthPage.jsx           # Login (todos os perfis)
│   │   ├── RegisterFamily.jsx     # Cadastro familia
│   │   ├── RegisterCaretaker.jsx  # Cadastro baba (codigo de convite)
│   │   ├── RegisterDoctor.jsx     # Cadastro pediatra (codigo de convite)
│   │   ├── CaretakerDiary.jsx     # Formulario da baba
│   │   ├── FamilyDashboard.jsx    # Dashboard dos pais
│   │   └── DoctorDashboard.jsx    # Dashboard da pediatra
│   └── utils/auth.js
├── backend/
│   ├── db/database.js             # Schema SQLite + migracao automatica
│   ├── routes/auth.js             # Login e cadastros
│   ├── routes/baby.js             # Dados do bebe, convites, peso
│   ├── routes/diary.js            # Diario (baba escreve, todos leem)
│   ├── routes/doctor.js           # Rotas exclusivas da pediatra
│   └── routes/reports.js          # Relatorio semanal (Claude API)
├── deploy.sh
└── .env.example
```

## Setup local

```bash
# 1. Backend
cd backend
cp ../.env.example .env
# Edite .env: ANTHROPIC_API_KEY e JWT_SECRET
npm install
npm run dev   # porta 3000

# 2. Frontend (outro terminal)
cd frontend
npm install
npm run dev   # porta 5173, proxia /api para :3000
```

Acesse: http://localhost:5173

## Deploy no Hostinger VPS (naninha.app)

### 1. Pre-requisitos no servidor

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 e Nginx
npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Subir os arquivos

```bash
# Na sua maquina local, dentro da pasta naninha/:
scp -r . usuario@ip-do-servidor:/home/usuario/naninha/
```

### 3. Configurar variaveis de ambiente

```bash
# No servidor:
cd /home/usuario/naninha
cp .env.example backend/.env
nano backend/.env
# Preencha: ANTHROPIC_API_KEY, JWT_SECRET, DB_PATH, PORT=3000
```

### 4. Build e start

```bash
chmod +x deploy.sh
./deploy.sh
```

### 5. Nginx

Crie `/etc/nginx/sites-available/naninha`:

```nginx
server {
    listen 80;
    server_name naninha.app www.naninha.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/naninha /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 6. SSL (HTTPS)

```bash
sudo certbot --nginx -d naninha.app -d www.naninha.app
# Certbot renova automaticamente
```

### 7. Apontar dominio

No painel do naninha.app (registrador do dominio):
- Registro A: `@` → IP do servidor Hostinger
- Registro A: `www` → IP do servidor Hostinger

## Fluxo de uso

1. Familia se cadastra em naninha.app → cria perfil do bebe
2. Sistema gera codigo de convite para baba (e separado para pediatra)
3. Baba acessa naninha.app/cadastro/baba com o codigo → vinculada ao bebe
4. Familia gera codigo de convite para pediatra na aba Equipe
5. Pediatra acessa naninha.app/cadastro/medica → vinculada ao bebe
6. Baba preenche diario todo dia
7. Familia ve resumo do dia, historico e relatorio semanal com IA
8. Pediatra ve todos os pacientes, historico completo e registra consultas

## Extensoes futuras

- Grafico de crescimento com curva OMS
- Relatorio mensal em PDF
- Notificacoes push (PWA)
- Multi-bebe por familia
- App mobile (React Native + mesmo backend)
- Planos pagos (Stripe)
