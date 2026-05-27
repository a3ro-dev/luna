import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const email = 'yasfinnaushad2019@gmail.com';
  const password = 'zxm8uce1UMZ2nzb*xru';

  const users = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    name: schema.users.name,
    passwordHash: schema.users.passwordHash,
  }).from(schema.users).where(eq(schema.users.email, email));

  if (users.length === 0) {
    console.log('❌ User NOT FOUND in database');
  } else {
    const user = users[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Has password hash:', !!user.passwordHash);

    if (user.passwordHash) {
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      console.log('  Password matches:', passwordMatch ? '✅ YES' : '❌ NO');
    }
  }
}

main().catch(console.error);
