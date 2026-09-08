import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fullInspection() {
  console.log('=== FULL SYSTEM INSPECTION ===\n');

  try {
    // 1. Check all customers with debt
    console.log('1. CUSTOMERS WITH DEBT:');
    const customersWithDebt = await prisma.customer.findMany({
      where: { debt: { gt: 0 } }
    });

    for (const customer of customersWithDebt) {
      const loans = await prisma.$queryRaw`
        SELECT * FROM loans
        WHERE customerId = ${customer.id}
        AND status IN ('ACTIVE', 'OVERDUE')
      ` as any[];

      const totalLoanDebt = loans.reduce((sum: number, l: any) => sum + Number(l.amountDue), 0);

      console.log(`\n  Customer: ${customer.name}`);
      console.log(`    Debt in customer record: $${customer.debt}`);
      console.log(`    Active loans debt: $${totalLoanDebt}`);
      console.log(`    Active loans count: ${loans.length}`);

      if (Number(customer.debt) !== totalLoanDebt) {
        console.log(`    ⚠️  MISMATCH! Difference: $${Number(customer.debt) - totalLoanDebt}`);
      } else {
        console.log(`    ✅ OK`);
      }
    }

    // 2. Check for orphaned loans (loans without matching customer debt)
    console.log('\n\n2. CHECKING FOR ORPHANED LOANS:');
    const activeLoans = await prisma.$queryRaw`
      SELECT l.*, c.name as customer_name, c.debt as customer_debt
      FROM loans l
      LEFT JOIN customers c ON l.customerId = c.id
      WHERE l.status IN ('ACTIVE', 'OVERDUE')
    ` as any[];

    let orphanedLoans = 0;
    for (const loan of activeLoans) {
      if (loan.customer_name) {
        // Check if customer debt is less than loan amount
        if (Number(loan.customer_debt) < Number(loan.amountDue)) {
          console.log(`\n  ⚠️  Loan ${loan.loanNumber} (${loan.customer_name})`);
          console.log(`    Loan amount due: $${loan.amountDue}`);
          console.log(`    Customer debt: $${loan.customer_debt}`);
          orphanedLoans++;
        }
      }
    }

    if (orphanedLoans === 0) {
      console.log('  ✅ No orphaned loans found');
    }

    // 3. Check customer payment logic
    console.log('\n\n3. CHECKING CUSTOMER PAYMENT ENDPOINT:');
    const customerServicePath = 'src/modules/customers/customers.service.ts';
    console.log(`  Checking: ${customerServicePath}`);
    console.log('  Need to verify if customer payments update loans...');

    // 4. Summary
    console.log('\n\n=== SUMMARY ===');
    console.log(`Total customers with debt: ${customersWithDebt.length}`);
    console.log(`Total active loans: ${activeLoans.length}`);
    console.log(`Orphaned loans: ${orphanedLoans}`);

    const mismatches = customersWithDebt.filter(c => {
      const loansForCustomer = activeLoans.filter(l => l.customerId === c.id);
      const totalLoanDebt = loansForCustomer.reduce((sum, l) => sum + Number(l.amountDue), 0);
      return Number(c.debt) !== totalLoanDebt;
    });

    console.log(`Customers with debt/loan mismatch: ${mismatches.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fullInspection();
