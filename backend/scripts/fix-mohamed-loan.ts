import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMohamed() {
  try {
    const loan = await prisma.loan.findFirst({
      where: { loanNumber: 'LOAN-1786696999611-Z1TJ' }
    });

    if (!loan) {
      console.log('Loan not found');
      return;
    }

    console.log('Current loan:', loan.loanNumber);
    console.log('  Principal: $', loan.principalAmount);
    console.log('  Amount Due: $', loan.amountDue);

    const updated = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        principalAmount: 400,
        amountDue: 400,
      }
    });

    console.log('\n✅ Updated loan:');
    console.log('  Principal: $', updated.principalAmount);
    console.log('  Amount Due: $', updated.amountDue);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMohamed();
