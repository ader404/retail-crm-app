export type Role = 'OWNER' | 'MANAGER' | 'CASHIER'
export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'ON_HOLD'
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR'
export type ExpenseCategory =
  | 'RENT'
  | 'SALARIES'
  | 'ELECTRICITY'
  | 'INTERNET'
  | 'TRANSPORTATION'
  | 'MARKETING'
  | 'REPAIRS'
  | 'MISCELLANEOUS'
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Brand {
  id: string
  name: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  serialNumber?: string
  imei?: string
  categoryId: string
  category?: Category
  brandId?: string
  brand?: Brand
  supplierId?: string
  supplier?: Supplier
  costPrice: number
  sellingPrice: number
  imageUrl?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  inventory?: Inventory[]
}

export interface Inventory {
  id: string
  productId: string
  product?: Product
  quantity: number
  minStock: number
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  credit: number
  debt: number
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string
  customer?: Customer
  userId: string
  user?: User
  status: SaleStatus
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  notes?: string
  items: SaleItem[]
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  product?: Product
  quantity: number
  costPrice: number
  sellingPrice: number
  discount: number
  total: number
  imeiDeviceId?: string | null
  imeiDevice?: { id: string; imei: string; status: string } | null
}

export interface Expense {
  id: string
  userId: string
  user?: User
  category: ExpenseCategory
  amount: number
  description?: string
  date: string
  createdAt: string
}

export interface Supplier {
  id: string
  companyName: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  userId: string
  user?: User
  action: string
  entity: string
  entityId?: string
  details?: Record<string, unknown>
  createdAt: string
}

export interface DashboardStats {
  todaySales: number
  todayProfit: number
  todayExpenses: number
  monthlyRevenue: number
  monthlyProfit: number
  monthlyExpenses: number
  productsSoldToday: number
  lowStockCount: number
  outOfStockCount: number
  totalCustomers: number
  totalProducts: number
  inventoryValue: number
  customerDebt: number
  totalEmployees: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  entityType?: string
  entityId?: string
  targetRoute?: string
}

export interface ApiError {
  statusCode: number
  message: string
  error: string
}
