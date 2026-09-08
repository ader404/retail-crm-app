import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLoans() {
  try {
    const loans = await prisma.$queryRaw`
      SELECT
        l.*,
        c.name as customer_name,
        (SELECT COUNT(*) FROM loan_payments WHERE loanId = l.id) as payment_count
      FROM loans l
      LEFT JOIN customers c ON l.customerId = c.id
      ORDER BY l.updatedAt DESC
    ` as any[];

    console.log('=== ALL LOANS ===\n');

    loans.forEach((loan: any) => {
      const entity = loan.customer_name || 'Supplier Loan';
      console.log(`Loan: ${loan.loanNumber}`);
      console.log(`  Entity: ${entity}`);
      console.log(`  Type: ${loan.type}`);
      console.log(`  Status: ${loan.status}`);
      console.log(`  Principal: $${loan.principalAmount}`);
      console.log(`  Amount Paid: $${loan.amountPaid}`);
      console.log(`  Amount Due: $${loan.amountDue}`);
      console.log(`  Payments: ${loan.payment_count}`);
      console.log(`  Updated: ${loan.updatedAt}`);
      console.log('');
    });

    // Check for completed loans
    const completed = loans.filter((l: any) => l.status === 'COMPLETED');
    console.log(`\n✅ Completed loans: ${completed.length}`);

    // Check for fully paid but not completed
    const fullyPaidButActive = loans.filter((l: any) => Number(l.amountDue) <= 0 && l.status !== 'COMPLETED');
    if (fullyPaidButActive.length > 0) {
      console.log(`\n⚠️  WARNING: ${fullyPaidButActive.length} loans are fully paid but not marked as COMPLETED:`);
      fullyPaidButActive.forEach((l: any) => {
        const entity = l.customer_name || 'Supplier';
        console.log(`  - ${l.loanNumber} (${entity}) - Status: ${l.status}, AmountDue: $${l.amountDue}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLoans();
