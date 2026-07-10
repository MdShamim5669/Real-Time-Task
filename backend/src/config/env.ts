import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const ENV = {
  PORT: process.env.PORT || '5000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
