import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

export default app;
