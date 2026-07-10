import app from './app';
import { ENV } from './config/env';
import { connectDB } from './config/db';

const startServer = async () => {
  // Database connection placeholder (disabled by default in dev if database is not set up)
  if (ENV.DATABASE_URL) {
    await connectDB();
  } else {
    console.log('Skipping DB connection - DATABASE_URL is not set.');
  }

  const PORT = parseInt(ENV.PORT, 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
