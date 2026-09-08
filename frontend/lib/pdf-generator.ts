/**
 * Centralized PDF Generation Utility
 * Uses jsPDF + html2canvas for professional PDF reports
 */

interface PDFConfig {
  title: string
  data: any[]
  columns: { key: string; label: string }[]
  filename: string
  filters?: Record<string, string>
  language: 'en' | 'fr' | 'ar'
  companyName?: string
}

interface ExportConfig {
  language: 'en' | 'fr' | 'ar'
  columns: string[]
  format: 'pdf' | 'print'
}

const ARABIC_FONTS = "'Segoe UI', 'Arabic Typesetting', 'Noto Sans Arabic', 'Tahoma', sans-serif"

function isRTL(lang: string): boolean {
  return lang === 'ar'
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    if (value % 1 !== 0) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return value.toLocaleString()
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

function generateReportHTML(config: PDFConfig, forPrint = false): string {
  const { title, data, columns, filters, language, companyName } = config
  const rtl = isRTL(language)
  const dir = rtl ? 'rtl' : 'ltr'
  const today = new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date().toLocaleTimeString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const filterEntries = filters ? Object.entries(filters).filter(([, v]) => v) : []
  const filterHTML = filterEntries.length > 0
    ? `<div style="background:#f8f9fa;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:12px;${rtl ? 'text-align:right;' : ''}">
        <div style="font-weight:600;margin-bottom:6px;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${language === 'ar' ? 'الفلاتر المطبقة' : language === 'fr' ? 'Filtres appliqués' : 'Applied Filters'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${filterEntries.map(([k, v]) => `<span style="background:#fff;border:1px solid #cbd5e1;border-radius:4px;padding:3px 8px;font-size:11px;"><strong>${k}:</strong> ${v}</span>`).join('')}
        </div>
       </div>`
    : ''

  const pageSize = 40
  const totalPages = Math.ceil(data.length / pageSize)
  const rowsPerPage = 25

  return `
<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @media print {
    @page { margin: 12mm 10mm; size: A4 landscape; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  body {
    font-family: ${ARABIC_FONTS};
    background: #fff;
    color: #1e293b;
    font-size: 13px;
    line-height: 1.5;
    padding: 0;
  }
  .report-container { max-width: 1100px; margin: 0 auto; padding: 24px; }
  .report-header {
    text-align: center;
    border-bottom: 2px solid #1e293b;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .company-name {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
    letter-spacing: -0.3px;
  }
  .report-title {
    font-size: 16px;
    font-weight: 600;
    color: #334155;
    margin-top: 6px;
  }
  .report-meta {
    font-size: 11px;
    color: #64748b;
    margin-top: 6px;
  }
  .report-meta span { margin: 0 6px; }
  .separator { width: 60px; height: 2px; background: #3b82f6; margin: 10px auto 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    font-size: 12px;
  }
  thead th {
    background: #1e293b;
    color: #fff;
    padding: 10px 12px;
    font-weight: 600;
    text-align: ${rtl ? 'right' : 'left'};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    border: 1px solid #0f172a;
  }
  tbody td {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    text-align: ${rtl ? 'right' : 'left'};
    vertical-align: middle;
    word-break: break-word;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #f1f5f9; }
  tbody tr:nth-child(even):hover { background: #e2e8f0; }
  .report-footer {
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #64748b;
  }
  .report-footer .total { font-weight: 600; color: #334155; }
  .no-data {
    text-align: center;
    padding: 40px;
    color: #94a3b8;
    font-size: 14px;
  }
</style>
</head>
<body>
<div class="report-container">
  <div class="report-header">
    ${companyName ? `<div class="company-name">${companyName}</div>` : ''}
    <div class="report-title">${title}</div>
    <div class="report-meta">
      <span>${language === 'ar' ? 'تاريخ الإنشاء:' : language === 'fr' ? 'Date de génération:' : 'Generated:'} ${today} ${time}</span>
      <span>|</span>
      <span>${language === 'ar' ? 'اللغة:' : language === 'fr' ? 'Langue:' : 'Language:'} ${language === 'ar' ? 'العربية' : language === 'fr' ? 'Français' : 'English'}</span>
    </div>
    <div class="separator"></div>
  </div>
  ${filterHTML}
  ${data.length === 0
    ? `<div class="no-data">${language === 'ar' ? 'لا توجد بيانات' : language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}</div>`
    : `<table>
      <thead>
        <tr>
          ${columns.map((col, i) => `<th style="${rtl ? 'text-align:right' : 'text-align:left'}">${col.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${columns.map(col => `<td>${formatCellValue(row[col.key])}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>`
  }
  <div class="report-footer">
    <div class="total">${language === 'ar' ? 'إجمالي السجلات:' : language === 'fr' ? 'Total des enregistrements:' : 'Total Records:'} ${data.length.toLocaleString()}</div>
    ${!forPrint ? `<div>${language === 'ar' ? `صفحة 1 من ${totalPages}` : language === 'fr' ? `Page 1 sur ${totalPages}` : `Page 1 of ${totalPages}`}</div>` : ''}
  </div>
</div>
</body>
</html>`
}

function createHiddenElement(html: string): HTMLDivElement {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1100px;
    background: #fff;
    z-index: -1;
    overflow: visible;
  `
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generatePDF(config: PDFConfig): Promise<void> {
  const [
    { default: jsPDF },
    { default: html2canvas },
  ] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const html = generateReportHTML(config, false)
  const container = createHiddenElement(html)

  await sleep(300)

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1100,
  })

  document.body.removeChild(container)

  const imgWidth = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pageHeight = 210

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  if (isRTL(config.language)) {
    pdf.setR2L(true)
  }

  const imgData = canvas.toDataURL('image/png')
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  const filename = config.filename.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
  pdf.save(`${filename}.pdf`)
}

export function printReport(config: PDFConfig): void {
  const html = generateReportHTML(config, true)
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) {
    alert('Please allow popups to print the report')
    return
  }

  printWindow.document.write(`<!DOCTYPE html><html dir="${isRTL(config.language) ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${config.title}</title></head><body>${html}</body></html>`)
  printWindow.document.close()

  const checkReady = setInterval(() => {
    if (printWindow.document.readyState === 'complete') {
      clearInterval(checkReady)
      setTimeout(() => {
        printWindow.print()
      }, 400)
    }
  }, 100)
}

export type { PDFConfig, ExportConfig }
