import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEverything() {
  console.log('=== RETAIL CRM SYSTEM CHECK ===\n');

  // 1. Check Users
  console.log('1. USERS:');
  const users = await prisma.user.findMany();
  console.log(`   Total users: ${users.length}`);
  users.forEach(u => console.log(`   - ${u.name} (${u.email}) [${u.role}]`));

  // 2. Check Products
  console.log('\n2. PRODUCTS:');
  const products = await prisma.product.count();
  console.log(`   Total products: ${products}`);

  // 3. Check Inventory
  console.log('\n3. INVENTORY:');
  const inventory = await prisma.inventory.findMany({ include: { product: true } });
  console.log(`   Total inventory records: ${inventory.length}`);
  if (inventory.length > 0) {
    console.log(`   Sample: ${inventory[0].product.name} - ${inventory[0].quantity} units`);
  }

  // 4. Check Customers
  console.log('\n4. CUSTOMERS:');
  const customers = await prisma.customer.count();
  console.log(`   Total customers: ${customers}`);

  // 5. Check Sales
  console.log('\n5. SALES:');
  const sales = await prisma.sale.findMany({
    include: { user: { select: { name: true } }, items: true }
  });
  console.log(`   Total sales: ${sales.length}`);
  sales.forEach(s => {
    console.log(`   - ${s.invoiceNumber}: $${s.total} by ${s.user?.name || 'UNKNOWN'} (${s.items.length} items)`);
  });

  // 6. Test sale creation data
  console.log('\n6. SAMPLE SALE DATA CHECK:');
  if (users.length > 0 && products > 0) {
    const sampleProduct = await prisma.product.findFirst({ include: { inventory: true } });
    console.log(`   ✅ Can create sale with:`);
    console.log(`      - User: ${users[0].name} (${users[0].id})`);
    console.log(`      - Product: ${sampleProduct?.name}`);
    console.log(`      - Stock: ${sampleProduct?.inventory?.quantity || 0}`);
  } else {
    console.log(`   ❌ Missing data - need users and products`);
  }

  await prisma.$disconnect();
}

checkEverything().catch(console.error);
