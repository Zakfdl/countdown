import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/widget', express.static(path.join(__dirname, '../public/widget')));
app.use('/dashboard/assets', express.static(path.join(__dirname, '../public/dashboard')));

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard/index.html'));
});

app.get('/', (_req, res) => {
  res.json({
    app: 'Countdown Growth for Salla',
    docs: '/docs',
    dashboard: '/dashboard?merchantId=demo-merchant',
    health: '/api/health'
  });
});

app.get('/docs', (_req, res) => {
  res.redirect('https://github.com/your-org/countdown#readme');
});

app.listen(config.port, () => {
  console.log(`Countdown app listening on ${config.appUrl}`);
});
