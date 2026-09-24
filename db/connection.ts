// location: db/connection.ts

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';

const envName = process.env.TEST_ENV ?? 'local';

// Does not override variables run-tests.sh already exported.
dotenv.config({
  path: path.resolve(process.cwd(), 'config', `${envName}.env`),
  quiet: true,
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (expected in config/${envName}.env)`);
  }
  return value;
}

let pool: mysql.Pool | null = null;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: required('_DB_HOST'),
      port: Number(required('_DB_PORT')),
      database: required('_DB_NAME'),
      user: required('_DB_USER'),
      password: required('_DB_PASSWORD'),
      connectionLimit: 10,
    });
  }

  return pool;
}