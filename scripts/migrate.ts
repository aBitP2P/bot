import 'dotenv/config'
import { migrate } from 'drizzle-orm/mysql2/migrator'; 
import { db } from '../src/db/index';

async function main() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();