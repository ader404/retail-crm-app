import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Try to get all tables
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Tables in database:', tables);

    // Try to get sales count using Prisma model
    try {
      const salesCount = await prisma.sale.count();
      console.log('\nTotal sales:', salesCount);

      if (salesCount > 0) {
        // Get a sample sale
        const sample = await prisma.sale.findFirst();
        console.log('Sample sale:', sample);
      }
    } catch (e) {
      console.log('Error getting sales:', e.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
