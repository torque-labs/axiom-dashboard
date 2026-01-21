import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Cube.js API configuration
const CUBE_API_URL = 'https://lime-catfish.aws-us-east-1.cubecloudapp.dev/cubejs-api/v1';
const CUBE_API_TOKEN = process.env.CUBE_API_TOKEN || '';

app.use(cors());
app.use(express.json());

// Proxy endpoint for Cube queries
app.post('/api/cube/load', async (req, res) => {
  try {
    const response = await fetch(`${CUBE_API_URL}/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CUBE_API_TOKEN && { 'Authorization': `Bearer ${CUBE_API_TOKEN}` }),
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Cube API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
