import { format } from 'date-fns';
import { Transaction } from './types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(transactions: Transaction[], filename?: string) {
  if (transactions.length === 0) return;

  const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Recurring', 'Frequency'];
  const rows = transactions.map((t) => [
    format(new Date(t.date), 'yyyy-MM-dd'),
    t.type,
    t.category?.name || 'Uncategorized',
    String(t.amount),
    t.description || '',
    t.is_recurring ? 'Yes' : 'No',
    t.recurring_frequency || '',
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  downloadBlob(
    csvContent,
    'text/csv;charset=utf-8;',
    filename || `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
  );
}

export function exportToExcel(transactions: Transaction[], filename?: string) {
  if (transactions.length === 0) return;

  const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Recurring', 'Frequency'];
  const rows = transactions.map((t) => [
    format(new Date(t.date), 'yyyy-MM-dd'),
    t.type,
    t.category?.name || 'Uncategorized',
    t.amount,
    t.description || '',
    t.is_recurring ? 'Yes' : 'No',
    t.recurring_frequency || '',
  ]);

  // Build XML spreadsheet (Excel-compatible)
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '  <Styles>\n';
  xml += '    <Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>\n';
  xml += '    <Style ss:ID="income"><Font ss:Color="#16A34A"/></Style>\n';
  xml += '    <Style ss:ID="expense"><Font ss:Color="#DC2626"/></Style>\n';
  xml += '    <Style ss:ID="number"><NumberFormat ss:Format="#,##0.00"/></Style>\n';
  xml += '  </Styles>\n';
  xml += '  <Worksheet ss:Name="Transactions">\n';
  xml += '    <Table>\n';

  // Header row
  xml += '      <Row>\n';
  headers.forEach((h) => {
    xml += `        <Cell ss:StyleID="header"><Data ss:Type="String">${h}</Data></Cell>\n`;
  });
  xml += '      </Row>\n';

  // Data rows
  rows.forEach((row) => {
    xml += '      <Row>\n';
    row.forEach((cell, i) => {
      if (i === 3) {
        // Amount as number
        const style = row[1] === 'income' ? 'income' : 'expense';
        xml += `        <Cell ss:StyleID="${style}"><Data ss:Type="Number">${cell}</Data></Cell>\n`;
      } else {
        xml += `        <Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>\n`;
      }
    });
    xml += '      </Row>\n';
  });

  xml += '    </Table>\n';
  xml += '  </Worksheet>\n';
  xml += '</Workbook>';

  downloadBlob(
    xml,
    'application/vnd.ms-excel',
    filename || `transactions-${format(new Date(), 'yyyy-MM-dd')}.xls`
  );
}

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
