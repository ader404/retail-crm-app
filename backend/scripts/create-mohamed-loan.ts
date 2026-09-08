import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createLoanForMohamed() {
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

    console.log('Creating loan for:', customer.name);
    console.log('Amount: $561');

    // Generate loan number
    const loanNumber = `LOAN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create the loan
    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        type: 'CUSTOMER_LOAN',
        customerId: customer.id,
        principalAmount: 561,
        amountPaid: 0,
        amountDue: 561,
        status: 'ACTIVE',
        reason: 'Retroactive loan created to match existing customer debt',
      }
    });

    console.log('\n✅ Loan created successfully!');
    console.log('Loan Number:', loan.loanNumber);
    console.log('Status:', loan.status);
    console.log('Amount Due: $', loan.amountDue);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createLoanForMohamed();
