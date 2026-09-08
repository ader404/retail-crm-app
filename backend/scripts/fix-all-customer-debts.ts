import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllCustomerDebts() {
  try {
    console.log('=== FIXING ALL CUSTOMER DEBTS ===\n');

    const customers = await prisma.customer.findMany();

    for (const customer of customers) {
      // Get unpaid sales
      const sales = await prisma.$queryRaw`
        SELECT * FROM sales
        WHERE customerId = ${customer.id}
        AND amountDue > 0
      ` as any[];

      const totalSalesDue = sales.reduce((sum: number, s: any) => sum + Number(s.amountDue), 0);

      // Get active loans
      const loans = await prisma.$queryRaw`
        SELECT * FROM loans
        WHERE customerId = ${customer.id}
        AND status IN ('ACTIVE', 'OVERDUE')
      ` as any[];

      const totalLoansDue = loans.reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);

      const correctDebt = totalSalesDue + totalLoansDue;
      const currentDebt = Number(customer.debt);

      if (correctDebt !== currentDebt) {
        console.log(`Customer: ${customer.name}`);
        console.log(`  Current debt: $${currentDebt}`);
        console.log(`  Unpaid sales: $${totalSalesDue}`);
        console.log(`  Active loans: $${totalLoansDue}`);
        console.log(`  Correct debt: $${correctDebt}`);

        await prisma.customer.update({
          where: { id: customer.id },
          data: { debt: correctDebt }
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

fixAllCustomerDebts();
