import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJohnDoe() {
  try {
    const customer = await prisma.customer.findFirst({
      where: { name: { contains: 'John' } }
    });

    if (!customer) {
      console.log('❌ John Doe not found');
      return;
    }

    console.log('=== CUSTOMER INFO ===');
    console.log('Name:', customer.name);
    console.log('Debt: $', customer.debt);
    console.log('ID:', customer.id);
    console.log('');

    const loans = await prisma.$queryRaw`
      SELECT * FROM loans WHERE customerId = ${customer.id}
    ` as any[];

    console.log('=== LOANS ===');
    console.log('Total loans for this customer:', loans.length);
    console.log('');

    loans.forEach((l: any) => {
      console.log('Loan:', l.loanNumber);
      console.log('  Status:', l.status);
      console.log('  Principal: $', l.principalAmount);
      console.log('  Paid: $', l.amountPaid);
      console.log('  Due: $', l.amountDue);
      console.log('  Type:', l.type);
      console.log('');
    });

    // Calculate total debt from active loans
    const totalDueFromLoans = loans
      .filter((l: any) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
      .reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);

    console.log('=== SUMMARY ===');
    console.log('Customer debt field: $', Number(customer.debt));
    console.log('Total due from active loans: $', totalDueFromLoans);
    console.log('Difference: $', Number(customer.debt) - totalDueFromLoans);

    if (Number(customer.debt) !== totalDueFromLoans) {
      console.log('\n⚠️  MISMATCH: Customer debt does not match sum of active loan amounts!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJohnDoe();
