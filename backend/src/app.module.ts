import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LoansModule } from './modules/loans/loans.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ChequesModule } from './modules/cheques/cheques.module';
import { SetupModule } from './modules/setup/setup.module';
import { ImeiModule } from './modules/imei/imei.module';
import { ApiPageAccessGuard } from './common/guards/api-page-access.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per 60 seconds per IP
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    CustomersModule,
    SalesModule,
    ExpensesModule,
    SuppliersModule,
    EmployeesModule,
    ReportsModule,
    DashboardModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
    LoansModule,
    PurchaseOrdersModule,
    ChequesModule,
    SetupModule,
    ImeiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiPageAccessGuard,
    },
  ],
})
export class AppModule {}
