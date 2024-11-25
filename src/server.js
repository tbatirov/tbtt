import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

app.post('/api/analyze-transaction', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!anthropic.apiKey) {
      throw new Error('API key not configured');
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: "You are an expert accountant. Analyze transactions and determine appropriate accounts for double-entry bookkeeping based on accounting principles and standards."
    });

    if (!response?.content?.[0]?.text) {
      throw new Error('Invalid response from AI service');
    }

    res.json({ result: response.content[0].text });
  } catch (error) {
    console.error('AI service error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});