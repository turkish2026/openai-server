const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ API_KEY is not set');
}

app.use(cors({
  origin: '*',                                 // при желании ограничим
  methods: ['POST', 'GET']
}));

app.use(express.json({ limit: '50kb' }));

app.set('trust proxy', 1);

/* Rate limit для API */
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

const allowedMacAddresses = ['D85ED35351D2', '60189512073D', '08606E944B0C'];

const TOKEN_EXPIRY_TIME = 30 * 60 * 1000;            // 30 минут
const tokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');     // 256-bit
}

function validateToken(token) {
  const data = tokens.get(token);
  if (!data) return false;

  if (Date.now() > data.expiry) {
    tokens.delete(token);
    return false;
  }
  return true;
}

app.get('/health', (_, res) => res.send('ok'));      // Health check

app.post('/checka', (req, res) => {                  // Получение токена
  const { aaa } = req.body;

  if (!aaa || typeof aaa !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!allowedMacAddresses.includes(aaa)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const token = generateToken();

  tokens.set(token, {
    aaa,
    expiry: Date.now() + TOKEN_EXPIRY_TIME
  });

  res.json({
    success: true,
    token,
    expiresIn: TOKEN_EXPIRY_TIME / 1000
  });
});

app.post('/api/chat', async (req, res) => {              // Chat API
  const { messages, token } = req.body;

  if (!token || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!validateToken(token, req)) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: 'OpenAI API error' });
  }
});

setInterval(() => {            // Очистка протухших токенов каждые 5 минут
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (now > data.expiry) {
      tokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {                                    // Start
  console.log(`Server running on port ${PORT}`);
});
