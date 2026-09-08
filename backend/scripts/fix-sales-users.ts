import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSales() {
  try {
    // Get the admin user
    const admin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Using admin user:', admin.email, admin.id);

    // Get all sales with their userIds
    const allSales = await prisma.sale.findMany({ select: { id: true, userId: true, invoiceNumber: true } });
    console.log(`\nFound ${allSales.length} sales`);

    // Check which users exist
    const userIds = [...new Set(allSales.map(s => s.userId))];
    console.log('Unique userIds in sales:', userIds);

    for (const userId of userIds) {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        console.log(`\n❌ User ${userId} does NOT exist - updating sales...`);
        const updated = await prisma.sale.updateMany({
          where: { userId },
          data: { userId: admin.id },
        });
        console.log(`   Updated ${updated.count} sales`);
      } else {
        console.log(`\n✅ User ${userId} (${userExists.name}) exists`);
      }
    }

    console.log('\n✅ All sales fixed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSales();
