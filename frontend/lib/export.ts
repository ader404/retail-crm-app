/**
 * Export Utilities
 * Provides CSV and PDF export functionality for tables and reports
 */

// CSV Export Functions

export function exportToCSV(data: any[], filename: string, headers?: string[]) {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    csvHeaders.join(','), // Header row
    ...data.map(row =>
      csvHeaders.map(header => {
        const value = row[header]
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')

  // Create and trigger download
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

export function exportTableToCSV(
  tableData: any[],
  columns: { key: string; label: string }[],
  filename: string
) {
  if (tableData.length === 0) {
    console.warn('No data to export')
    return
  }

  const headers = columns.map(col => col.label)
  const data = tableData.map(row => {
    const csvRow: any = {}
    columns.forEach(col => {
      csvRow[col.label] = row[col.key]
    })
    return csvRow
  })

  exportToCSV(data, filename, headers)
}

// PDF Export Functions (Basic implementation without external libraries)

export function exportToPDF(
  title: string,
  data: any[],
  columns: { key: string; label: string }[],
  filename: string
) {
  // For now, we'll create a printable HTML page
  // This can be enhanced with a library like jsPDF later
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to export PDF')
    return
  }

  const html = generatePrintableHTML(title, data, columns)
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  // Trigger print dialog
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

function generatePrintableHTML(
  title: string,
  data: any[],
  columns: { key: string; label: string }[]
): string {
  const today = new Date().toLocaleDateString()

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
          }
          .date {
            color: #666;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th {
            background-color: #f5f5f5;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
            font-weight: 600;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="date">Generated on ${today}</div>
        </div>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => `<td>${formatCellValue(row[col.key])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Records: ${data.length}</p>
        </div>
      </body>
    </html>
  `
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    // Check if it's a currency value (has decimals)
    if (value % 1 !== 0) {
      return `$${value.toFixed(2)}`
    }
    return value.toString()
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

// Helper function to trigger file download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Format currency for export
export function formatCurrencyForExport(amount: number): string {
  return amount.toFixed(2)
}

// Format date for export
export function formatDateForExport(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

// Print function for ledgers and statements
export function printPage() {
  window.print()
}
