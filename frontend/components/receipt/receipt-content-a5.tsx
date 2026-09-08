import { forwardRef } from 'react'
import { formatCurrency, formatDateTime, resolveImageUrl } from '@/lib/utils'
import type { ReceiptSale, ReceiptSettings, ReceiptTranslations } from './receipt-content'

export const ReceiptContentA5 = forwardRef<HTMLDivElement, { sale: ReceiptSale; settings: ReceiptSettings; translations: ReceiptTranslations }>(
  ({ sale, settings, translations }, ref) => {
    return (
      <div ref={ref} className="bg-white text-black w-[520px] mx-auto p-6 text-sm font-mono">
        {/* Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-dashed border-black">
          {settings.showLogoOnReceipt && settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(settings.logoUrl)} alt="logo" className="h-16 w-16 object-contain" crossOrigin="anonymous" />
          )}
          <div className="flex-1 text-center">
            <div className="font-bold text-lg">{settings.companyName}</div>
            {settings.showAddressOnReceipt && settings.address && <div className="text-xs mt-0.5">{settings.address}</div>}
            {settings.showPhoneOnReceipt && settings.phone && <div className="text-xs">{translations.tel} {settings.phone}</div>}
            {settings.showEmailOnReceipt && settings.email && <div className="text-xs">{settings.email}</div>}
            {settings.showTaxIdOnReceipt && settings.taxId && <div className="text-xs">{translations.taxId} {settings.taxId}</div>}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="py-3 grid grid-cols-2 gap-x-8 text-xs border-b border-dashed border-black">
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-gray-500">{translations.invoice}</span><span className="font-semibold">{sale.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{translations.date}</span><span>{formatDateTime(sale.createdAt)}</span></div>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-gray-500">{translations.cashier}</span><span>{sale.user.name}</span></div>
            {sale.customer?.name && <div className="flex justify-between"><span className="text-gray-500">{translations.customer}</span><span>{sale.customer.name}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">{translations.paymentMethod}</span><span>{translations.paymentMethods[sale.paymentMethod as keyof typeof translations.paymentMethods] ?? sale.paymentMethod}</span></div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-3 border-b border-dashed border-black">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">{translations.item}</th>
                <th className="text-center py-1 w-16">{translations.qty}</th>
                <th className="text-right py-1 w-20">{translations.price}</th>
                <th className="text-right py-1 w-24">{translations.total}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-1.5 font-semibold">
                    <div>{item.product.name}</div>
                    {item.imeiDevice?.imei && (
                      <div className="text-gray-500 font-normal">IMEI: {item.imeiDevice.imei}</div>
                    )}
                  </td>
                  <td className="py-1.5 text-center">{item.quantity}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.sellingPrice)}</td>
                  <td className="py-1.5 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="py-3 text-xs space-y-0.5 border-b border-dashed border-black">
          <div className="flex justify-between"><span>{translations.subtotal}</span><span>{formatCurrency(sale.subtotal)}</span></div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span>{translations.discount} {sale.discountType === 'FIXED_AMOUNT' ? translations.fixedDiscount : translations.percentDiscount}</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          {sale.tax > 0 && <div className="flex justify-between"><span>{translations.tax}</span><span>{formatCurrency(sale.tax)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-1"><span>{translations.total}</span><span>{formatCurrency(sale.total)}</span></div>

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

        <div className="pt-3 text-center text-xs whitespace-pre-line">{settings.receiptFooter}</div>
      </div>
    )
  },
)
ReceiptContentA5.displayName = 'ReceiptContentA5'
