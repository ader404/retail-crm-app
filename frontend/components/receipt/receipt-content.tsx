import { forwardRef } from 'react'
import { formatCurrency, formatDateTime, resolveImageUrl } from '@/lib/utils'

export interface ReceiptSaleItem {
  id: string
  quantity: number
  sellingPrice: number
  discount: number
  total: number
  product: { name: string; sku: string }
  imeiDevice?: { imei: string } | null
}

export interface ReceiptSale {
  invoiceNumber: string
  subtotal: number
  discount: number
  discountType?: string
  tax: number
  total: number
  amountPaid?: number
  amountDue?: number
  paymentStatus?: string
  paymentMethod: string
  createdAt: string
  status?: string
  customer?: { name: string; phone?: string } | null
  user: { name: string }
  items: ReceiptSaleItem[]
}

export interface ReceiptSettings {
  companyName: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  currency: string
  receiptFooter: string
  showLogoOnReceipt: boolean
  receiptLocale: string
  showPhoneOnReceipt: boolean
  showEmailOnReceipt: boolean
  showAddressOnReceipt: boolean
  showTaxIdOnReceipt: boolean
}

export interface ReceiptTranslations {
  date: string
  cashier: string
  customer: string
  phone: string
  paymentMethod: string
  item: string
  qty: string
  price: string
  disc: string
  total: string
  subtotal: string
  discount: string
  tax: string
  amountPaid: string
  amountDue: string
  paymentStatus: string
  dialogTitle: string
  print: string
  generating: string
  downloadPdf: string
  whatsapp: string
  gmail: string
  popupsBlocked: string
  pdfFailed: string
  tel: string
  taxId: string
  invoice: string
  fixedDiscount: string
  percentDiscount: string
  paymentMethods: {
    CASH: string
    CARD: string
    BANK_TRANSFER: string
    QR: string
  }
  paymentStatuses: {
    PAID: string
    PARTIALLY_PAID: string
    UNPAID: string
  }
}

export const ReceiptContent = forwardRef<HTMLDivElement, { sale: ReceiptSale; settings: ReceiptSettings; translations: ReceiptTranslations }>(
  ({ sale, settings, translations }, ref) => {
    return (
      <div ref={ref} className="bg-white text-black w-[320px] mx-auto p-4 text-sm font-mono">
        <div className="flex flex-col items-center text-center gap-1 pb-2 border-b border-dashed border-black">
          {settings.showLogoOnReceipt && settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(settings.logoUrl)} alt="logo" className="h-12 w-12 object-contain mb-1" crossOrigin="anonymous" />
          )}
          <div className="font-bold text-base">{settings.companyName}</div>
          {settings.showAddressOnReceipt && settings.address && <div className="text-xs">{settings.address}</div>}
          {settings.showPhoneOnReceipt && settings.phone && <div className="text-xs">{translations.tel} {settings.phone}</div>}
          {settings.showEmailOnReceipt && settings.email && <div className="text-xs">{settings.email}</div>}
          {settings.showTaxIdOnReceipt && settings.taxId && <div className="text-xs">{translations.taxId} {settings.taxId}</div>}
        </div>

        <div className="py-2 text-xs space-y-0.5 border-b border-dashed border-black">
          <div className="flex justify-between"><span>{translations.invoice}</span><span>{sale.invoiceNumber}</span></div>
          <div className="flex justify-between"><span>{translations.date}</span><span>{formatDateTime(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>{translations.cashier}</span><span>{sale.user.name}</span></div>
          {sale.customer?.name && <div className="flex justify-between"><span>{translations.customer}</span><span>{sale.customer.name}</span></div>}
          <div className="flex justify-between"><span>{translations.paymentMethod}</span><span>{translations.paymentMethods[sale.paymentMethod as keyof typeof translations.paymentMethods] ?? sale.paymentMethod}</span></div>
        </div>

        <div className="py-2 border-b border-dashed border-black">
          {sale.items.map((item) => (
            <div key={item.id} className="mb-1.5">
              <div className="flex justify-between text-xs font-semibold"><span>{item.product.name}</span></div>
              <div className="flex justify-between text-xs">
                <span>{item.quantity} x {formatCurrency(item.sellingPrice)}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
              {item.imeiDevice?.imei && (
                <div className="text-xs text-gray-500">IMEI: {item.imeiDevice.imei}</div>
              )}
            </div>
          ))}
        </div>

        <div className="py-2 text-xs space-y-0.5 border-b border-dashed border-black">
          <div className="flex justify-between"><span>{translations.subtotal}</span><span>{formatCurrency(sale.subtotal)}</span></div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span>{translations.discount} {sale.discountType === 'FIXED_AMOUNT' ? translations.fixedDiscount : translations.percentDiscount}</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          {sale.tax > 0 && <div className="flex justify-between"><span>{translations.tax}</span><span>{formatCurrency(sale.tax)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1"><span>{translations.total}</span><span>{formatCurrency(sale.total)}</span></div>

          {/* Payment Details */}
          {sale.amountPaid !== undefined && (
            <>
              <div className="border-t border-dashed border-black pt-1 mt-1"></div>
              <div className="flex justify-between"><span>{translations.amountPaid}</span><span>{formatCurrency(sale.amountPaid)}</span></div>
              {sale.amountDue !== undefined && sale.amountDue > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>{translations.amountDue}</span>
                  <span>{formatCurrency(sale.amountDue)}</span>
                </div>
              )}
              {sale.paymentStatus && (
                <div className="flex justify-between">
                  <span>{translations.paymentStatus}</span>
                  <span className={
                    sale.paymentStatus === 'PAID' ? 'text-green-600 font-semibold' :
                    sale.paymentStatus === 'PARTIALLY_PAID' ? 'text-orange-600 font-semibold' :
                    'text-red-600 font-semibold'
                  }>
                    {translations.paymentStatuses[sale.paymentStatus as keyof typeof translations.paymentStatuses] || sale.paymentStatus}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-2 text-center text-xs whitespace-pre-line">{settings.receiptFooter}</div>
      </div>
    )
  },
)
ReceiptContent.displayName = 'ReceiptContent'
