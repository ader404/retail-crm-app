export const MODULE_ACCESS_MAP: Record<string, { routes: RegExp[]; apiPrefixes: string[] }> = {
  dashboard: {
    routes: [/^\/dashboard$/],
    apiPrefixes: [],
  },
  pos: {
    routes: [/^\/pos$/],
    apiPrefixes: ['sales'],
  },
  products: {
    routes: [/^\/products/],
    apiPrefixes: ['products'],
  },
  categories: {
    routes: [/^\/categories/],
    apiPrefixes: ['categories'],
  },
  customers: {
    routes: [/^\/customers/],
    apiPrefixes: ['customers'],
  },
  suppliers: {
    routes: [/^\/suppliers/],
    apiPrefixes: ['suppliers'],
  },
  sales: {
    routes: [/^\/sales/],
    apiPrefixes: ['sales'],
  },
  cheques: {
    routes: [/^\/cheques/],
    apiPrefixes: ['cheques'],
  },
  expenses: {
    routes: [/^\/expenses/],
    apiPrefixes: ['expenses'],
  },
  loans: {
    routes: [/^\/loans/],
    apiPrefixes: ['loans'],
  },
  employees: {
    routes: [/^\/employees/],
    apiPrefixes: ['users'],
  },
  reports: {
    routes: [/^\/reports/],
    apiPrefixes: ['reports'],
  },
  settings: {
    routes: [/^\/settings/],
    apiPrefixes: ['settings', 'shop-settings'],
  },
  notifications: {
    routes: [],
    apiPrefixes: ['notifications'],
  },
  inventory: {
    routes: [],
    apiPrefixes: ['inventory'],
  },
}

export const ALL_MODULE_KEYS = Object.keys(MODULE_ACCESS_MAP)

export const MODULE_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    pos: 'POS',
    products: 'Products',
    categories: 'Categories',
    customers: 'Customers',
    suppliers: 'Suppliers',
    sales: 'Sales',
    cheques: 'Cheques',
    expenses: 'Expenses',
    loans: 'Loans',
    employees: 'Employees',
    reports: 'Reports',
    settings: 'Settings',
    notifications: 'Notifications',
    inventory: 'Inventory',
  },
  fr: {
    dashboard: 'Tableau de bord',
    pos: 'POS',
    products: 'Produits',
    categories: 'Catégories',
    customers: 'Clients',
    suppliers: 'Fournisseurs',
    sales: 'Ventes',
    cheques: 'Chèques',
    expenses: 'Dépenses',
    loans: 'Prêts',
    employees: 'Employés',
    reports: 'Rapports',
    settings: 'Paramètres',
    notifications: 'Notifications',
    inventory: 'Inventaire',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    pos: 'نقطة البيع',
    products: 'المنتجات',
    categories: 'الفئات',
    customers: 'العملاء',
    suppliers: 'الموردون',
    sales: 'المبيعات',
    cheques: 'الشيكات',
    expenses: 'المصروفات',
    loans: 'القروض',
    employees: 'الموظفون',
    reports: 'التقارير',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    inventory: 'المخزون',
  },
}

export const PAGE_ACCESS_MODULE_GROUPS = [
  {
    key: 'main',
    modules: ['dashboard', 'notifications'],
  },
  {
    key: 'sales',
    modules: ['pos', 'sales', 'customers', 'loans'],
  },
  {
    key: 'inventory',
    modules: ['products', 'categories', 'suppliers'],
  },
  {
    key: 'finance',
    modules: ['expenses', 'cheques', 'reports'],
  },
  {
    key: 'admin',
    modules: ['employees', 'settings'],
  },
]
