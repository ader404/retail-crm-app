import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMohamed() {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: 'mohamed' } },
          { name: { contains: 'Mohamed' } },
          { name: { contains: 'MOHAMED' } }
        ]
      }
    });

    if (customers.length === 0) {
      console.log('Mohamed not found');
      return;
    }

    const customer = customers[0];

    console.log('=== CUSTOMER ===');
    console.log('Name:', customer.name);
    console.log('Debt: $', customer.debt);
    console.log('ID:', customer.id);
    console.log('');

    const loans = await prisma.$queryRaw`
      SELECT * FROM loans WHERE customerId = ${customer.id}
    ` as any[];

    console.log('=== LOANS ===');
    console.log('Total loans:', loans.length);
    console.log('');

    if (loans.length === 0) {
      console.log('⚠️  NO LOANS FOUND for this customer!');
      console.log('But customer has debt of $', Number(customer.debt));
      console.log('\nThis customer needs a loan created to match the debt.');
    } else {
      loans.forEach((l: any) => {
        console.log('Loan:', l.loanNumber);
        console.log('  Status:', l.status);
        console.log('  Principal: $', l.principalAmount);
        console.log('  Paid: $', l.amountPaid);
        console.log('  Due: $', l.amountDue);
        console.log('');
      });

      const activeDebt = loans
        .filter((l: any) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
        .reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);

      console.log('Active loan debt: $', activeDebt);
      console.log('Customer debt field: $', Number(customer.debt));
      console.log('Difference: $', Number(customer.debt) - activeDebt);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMohamed();
