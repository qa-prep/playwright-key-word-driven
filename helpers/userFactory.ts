// location: helpers/userFactory.ts

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({
  path: './config/local.env'
});

let pool: mysql.Pool | null = null;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 10
    });
  }

  return pool;
}