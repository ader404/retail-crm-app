import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllUserReferences() {
  console.log('=== FIXING ALL USER REFERENCES ===\n');

  const admin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }

  console.log('✅ Using admin user:', admin.email, '\n');

  // Fix Sales
  console.log('1. Checking Sales...');
  try {
    const sales = await prisma.sale.findMany({ select: { id: true, userId: true } });
    let fixedSales = 0;
    for (const sale of sales) {
      const userExists = await prisma.user.findUnique({ where: { id: sale.userId } });
      if (!userExists) {
        await prisma.sale.update({ where: { id: sale.id }, data: { userId: admin.id } });
        fixedSales++;
      }
    }
    console.log(`   ✅ Fixed ${fixedSales} sales\n`);
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  // Fix Expenses
  console.log('2. Checking Expenses...');
  try {
    const expenses = await prisma.expense.findMany({ select: { id: true, userId: true } });
    let fixedExpenses = 0;
    for (const expense of expenses) {
      const userExists = await prisma.user.findUnique({ where: { id: expense.userId } });
      if (!userExists) {
        await prisma.expense.update({ where: { id: expense.id }, data: { userId: admin.id } });
        fixedExpenses++;
      }
    }
    console.log(`   ✅ Fixed ${fixedExpenses} expenses\n`);
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  console.log('=== ALL DONE ===');
  await prisma.$disconnect();
}

fixAllUserReferences().catch(console.error);
