import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  const email = 'mohamed@aderuix.com';
  const password = '136083153';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Mohamed',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ User created/updated in MySQL:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   Role:', user.role);
  console.log('   ID:', user.id);
  console.log('   Active:', user.isActive);

  await prisma.$disconnect();
}

createUser().catch(console.error);
