const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/baby',    require('./routes/baby'));
app.use('/api/diary',   require('./routes/diary'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/doctor',  require('./routes/doctor'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => app.listen(PORT, () => console.log(`Naninha rodando na porta ${PORT}`)))
  .catch(err => { console.error('Falha ao inicializar DB:', err); process.exit(1); });
