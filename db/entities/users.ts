// location: db/enities/users.ts

import { getDb } from '../connection';
import { schema } from '../schema';
import { debugLog } from '../../keyword_driven/generic/support/debug';


export async function getUsernameById(userId: number): Promise<string | null> {
  const db = getDb();
  const [rows] = await db.execute(`SELECT ${schema.users.username} FROM ${schema.users.table} WHERE ${schema.users.id} = ?`,[userId]);
  const users = rows as any[];
  if (users.length === 0) {return null;}
  return users[0][schema.users.username];
}

export async function getUsernameByEmail(email: string): Promise<string | null> {
  const db = getDb();
  const [rows] = await db.execute(`SELECT ${schema.users.username} FROM ${schema.users.table} WHERE ${schema.users.email} = ?`,[email]);
  const users = rows as any[];
  if (users.length === 0) {return null;}
  return users[0][schema.users.username];
}

export async function getUserIdByEmail(email: string): Promise<number | null> {
  const db = getDb();
  const [rows] = await db.execute(`SELECT ${schema.users.id} FROM ${schema.users.table} WHERE ${schema.users.email} = ?`,[email]);
  const users = rows as any[];
  if (users.length === 0) {return null;}
  return users[0][schema.users.id];
}

// better to use an api endpoint written for cleaning up test data (so that other tables can be cleaned up according to devs' intentions)
export async function deleteUserByEmail(email: string): Promise<void> {
  const db = getDb();
  const sql = `DELETE FROM ${schema.users.table} WHERE ${schema.users.email} = ?`;
  debugLog('sql', sql, { email });
  await db.execute(sql, [email]);
}
