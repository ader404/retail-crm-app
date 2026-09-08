import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMohamedSales() {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { name: { contains: 'mohamed' } },
          { name: { contains: 'Mohamed' } }
        ]
      }
    });

    if (!customer) {
      console.log('Mohamed not found');
      return;
    }

    console.log('=== MOHAMED DETAILS ===');
    console.log('Customer debt: $', customer.debt);
    console.log('Total paid: $', customer.totalPaid);
    console.log('');

    // Check unpaid sales
    const sales = await prisma.$queryRaw`
      SELECT * FROM sales WHERE customerId = ${customer.id}
    ` as any[];

    console.log('=== SALES ===');
    console.log('Total sales:', sales.length);

    sales.forEach((s: any) => {
      console.log(`\nSale: ${s.invoiceNumber}`);
      console.log('  Total: $', s.total);
      console.log('  Paid: $', s.amountPaid);
      console.log('  Due: $', s.amountDue);
      console.log('  Payment Status:', s.paymentStatus);
    });

    const unpaidSales = sales.filter((s: any) => Number(s.amountDue) > 0);
    const totalSalesDue = unpaidSales.reduce((sum: number, s: any) => sum + Number(s.amountDue), 0);

    // Check loans
    const loans = await prisma.$queryRaw`
      SELECT * FROM loans WHERE customerId = ${customer.id}
    ` as any[];

    console.log('\n\n=== LOANS ===');
    loans.forEach((l: any) => {
      console.log(`\nLoan: ${l.loanNumber}`);
      console.log('  Principal: $', l.principalAmount);
      console.log('  Paid: $', l.amountPaid);
      console.log('  Due: $', l.amountDue);
      console.log('  Status:', l.status);
    });

    const activeLoans = loans.filter((l: any) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    const totalLoansDue = activeLoans.reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);

    console.log('\n\n=== SUMMARY ===');
    console.log('Customer debt: $', Number(customer.debt));
    console.log('Unpaid sales: $', totalSalesDue);
    console.log('Active loans: $', totalLoansDue);
    console.log('Total (sales + loans): $', totalSalesDue + totalLoansDue);
    console.log('Difference: $', Number(customer.debt) - (totalSalesDue + totalLoansDue));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMohamedSales();
