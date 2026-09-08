import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSales() {
  try {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', admin.email, admin.id);

    // Check for sales with null userId
    const nullSales = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM \`Sale\` WHERE userId IS NULL
    `;
    console.log('Sales with null userId:', nullSales);

    // Update them
    const result = await prisma.$executeRaw`
      UPDATE \`Sale\` SET userId = ${admin.id} WHERE userId IS NULL
    `;

    console.log('✅ Updated', result, 'sales');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSales();
