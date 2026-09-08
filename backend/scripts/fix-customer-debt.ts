import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCustomerDebt() {
  try {
    console.log('=== FIXING CUSTOMER DEBT ===\n');

    // Get all customers
    const customers = await prisma.customer.findMany();

    for (const customer of customers) {
      // Calculate actual debt from active loans
      const loans = await prisma.$queryRaw`
        SELECT * FROM loans
        WHERE customerId = ${customer.id}
        AND status IN ('ACTIVE', 'OVERDUE')
      ` as any[];

      const actualDebt = loans.reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);
      const currentDebt = Number(customer.debt);

      if (actualDebt !== currentDebt) {
        console.log(`Customer: ${customer.name}`);
        console.log(`  Current debt in DB: $${currentDebt}`);
        console.log(`  Actual debt from loans: $${actualDebt}`);
        console.log(`  Difference: $${currentDebt - actualDebt}`);

        // Fix it
        await prisma.customer.update({
          where: { id: customer.id },
          data: { debt: actualDebt }
        });

        console.log(`  ✅ Fixed!\n`);
      }
    }

    console.log('=== DONE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerDebt();
