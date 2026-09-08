import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  const email = 'admin@admin.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log('✅ User created in MySQL:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   ID:', user.id);

  await prisma.$disconnect();
}

createUser().catch(console.error);
