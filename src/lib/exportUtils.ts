import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Category, CustomerSummary, Product, Requisition, Sale, SaleItem, StoreConfig, ShiftSummaryReport } from '../types';
import { getThemeDetails } from './theme';
import { maskPhoneNumber } from './phoneUtils';

/**
 * Common PDF page styling helper with store branding & theme palette
 */
function createStyledDoc(storeConfig: StoreConfig, title: string, subtitle?: string): { doc: jsPDF; themeRgb: [number, number, number]; startY: number } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const theme = getThemeDetails(storeConfig.primary_color, storeConfig.primary_color_hex);
  const themeRgb = theme.rgb;

  // Header Brand Accent Bar
  doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.rect(0, 0, 210, 5, 'F');

  // Store Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text(storeConfig.store_name.toUpperCase(), 14, 15);

  // Branch & Contact Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  const branchMeta = [
    storeConfig.branch,
    `Tel: ${storeConfig.phone_number}`,
    `M-Pesa Till: ${storeConfig.till_number}`,
  ]
    .filter(Boolean)
    .join('  •  ');
  doc.text(branchMeta, 14, 20);

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(14, 23, 196, 23);

  // Document Title & Generation Timestamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, 14, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const dateStr = `Generated: ${new Date().toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} at ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateStr, 196, 30, { align: 'right' });

  if (subtitle) {
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, 35);
  }

  const startY = subtitle ? 39 : 34;
  return { doc, themeRgb, startY };
}

/**
 * Add page numbering and footer to all pages in a jsPDF document
 */
function addDocFooters(doc: jsPDF, storeConfig: StoreConfig, themeRgb: [number, number, number]) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 285, 196, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`${storeConfig.store_name} • BazuPOS Retail & Spirits Management`, 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }
}

// ============================================================================
// 1. CUSTOMERS EXPORT (PDF & EXCEL)
// ============================================================================

export function exportCustomersPDF(customers: CustomerSummary[], storeConfig: StoreConfig) {
  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    'CUSTOMER DIRECTORY & ACCOUNTS LEDGER',
    `Total Customers: ${customers.length}  |  Total Outstanding Debt: KES ${customers.reduce((sum, c) => sum + c.outstandingDebt, 0).toLocaleString()}`
  );

  // Summary Metrics Banner Box
  const totalDebt = customers.reduce((sum, c) => sum + c.outstandingDebt, 0);
  const debtCount = customers.filter((c) => c.outstandingDebt > 0).length;
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 13, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Accounts: ${customers.length}`, 18, startY + 5);
  doc.text(`Cumulative Spend: KES ${totalSpent.toLocaleString()}`, 65, startY + 5);
  doc.setTextColor(totalDebt > 0 ? 225 : 5, totalDebt > 0 ? 29 : 150, totalDebt > 0 ? 72 : 105);
  doc.text(`Outstanding Debt: KES ${totalDebt.toLocaleString()} (${debtCount} debtors)`, 130, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text('Client credit records and historical payment reconciliations', 18, startY + 9.5);

  const tableBody = customers.map((c, index) => [
    (index + 1).toString(),
    c.customer.name,
    c.customer.phone || 'N/A',
    c.salesCount.toString(),
    `KES ${c.totalSpent.toLocaleString()}`,
    `KES ${c.totalPaid.toLocaleString()}`,
    `KES ${c.outstandingDebt.toLocaleString()}`,
    c.outstandingDebt > 0 ? 'DEBT OWED' : 'CLEARED',
  ]);

  autoTable(doc, {
    startY: startY + 16,
    head: [['#', 'Customer Name', 'Phone Number', 'Sales', 'Total Spend', 'Total Paid', 'Balance', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 20, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const rowData = customers[data.row.index];
        if (rowData && rowData.outstandingDebt > 0) {
          data.cell.styles.textColor = [225, 29, 72]; // red for debt
        } else {
          data.cell.styles.textColor = [5, 150, 105]; // green
        }
      }
      if (data.section === 'body' && data.column.index === 7) {
        const rowData = customers[data.row.index];
        if (rowData && rowData.outstandingDebt > 0) {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
  });

  addDocFooters(doc, storeConfig, themeRgb);
  doc.save(`customers_ledger_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportCustomersExcel(customers: CustomerSummary[], storeConfig: StoreConfig) {
  const wb = XLSX.utils.book_new();

  const totalDebt = customers.reduce((sum, c) => sum + c.outstandingDebt, 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);

  const headerRows = [
    [storeConfig.store_name.toUpperCase()],
    [`Branch: ${storeConfig.branch}`, `Tel: ${storeConfig.phone_number}`, `Till: ${storeConfig.till_number}`],
    ['CUSTOMER ACCOUNTS & DEBT AUDIT REPORT', `Generated: ${new Date().toLocaleString('en-KE')}`],
    [],
    ['#', 'Customer Name', 'Phone Number', 'Email', 'Sales Count', 'Total Spent (KES)', 'Total Paid (KES)', 'Outstanding Debt (KES)', 'Account Status', 'Notes'],
  ];

  const dataRows = customers.map((c, idx) => [
    idx + 1,
    c.customer.name,
    c.customer.phone || '',
    c.customer.email || '',
    c.salesCount,
    c.totalSpent,
    c.totalPaid,
    c.outstandingDebt,
    c.outstandingDebt > 0 ? 'DEBT OWED' : 'CLEARED',
    c.customer.notes || '',
  ]);

  const summaryRow = [
    'TOTALS',
    `${customers.length} Customers`,
    '',
    '',
    customers.reduce((sum, c) => sum + c.salesCount, 0),
    totalSpent,
    totalPaid,
    totalDebt,
    totalDebt > 0 ? 'UNSETTLED BALANCES' : 'FULLY SETTLED',
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], summaryRow]);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 28 }, // Name
    { wch: 18 }, // Phone
    { wch: 24 }, // Email
    { wch: 12 }, // Sales Count
    { wch: 18 }, // Spent
    { wch: 18 }, // Paid
    { wch: 22 }, // Debt
    { wch: 16 }, // Status
    { wch: 30 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, `customers_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============================================================================
// 2. STOCKS / INVENTORY EXPORT (PDF & EXCEL)
// ============================================================================

export function exportStockPDF(products: Product[], categories: Category[], storeConfig: StoreConfig) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const defaultThreshold = storeConfig.low_stock_threshold || 10;

  const totalUnits = products.reduce((sum, p) => sum + p.stock_qty, 0);
  const totalValuation = products.reduce((sum, p) => sum + p.price * p.stock_qty, 0);
  const lowStockItems = products.filter((p) => p.stock_qty <= (p.low_stock_threshold || defaultThreshold));

  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    'INVENTORY STATUS & STOCK VALUATION REPORT',
    `Catalog Size: ${products.length} Items  |  Total Physical Stock: ${totalUnits.toLocaleString()} Units`
  );

  // Executive Metrics Ribbon Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 13, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Catalog: ${products.length} Products`, 18, startY + 5);
  doc.text(`Total Stock: ${totalUnits.toLocaleString()} Units`, 65, startY + 5);
  doc.text(`Inventory Value: KES ${totalValuation.toLocaleString()}`, 115, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text(
    lowStockItems.length > 0
      ? `Alert: ${lowStockItems.length} products currently below safety reorder threshold`
      : 'All product inventory levels currently healthy and above threshold',
    18,
    startY + 9.5
  );

  const tableBody = products.map((p, idx) => {
    const threshold = p.low_stock_threshold || defaultThreshold;
    let status = 'In Stock';
    if (p.stock_qty === 0) status = 'Out of Stock';
    else if (p.stock_qty <= threshold) status = 'Low Stock';

    const categoryName = catMap.get(p.category) || p.category || 'General';
    const totalVal = p.price * p.stock_qty;

    return [
      (idx + 1).toString(),
      p.barcode || 'N/A',
      p.name,
      categoryName,
      `${p.stock_qty} ${p.unit || 'btl'}`,
      `KES ${p.price.toLocaleString()}`,
      `KES ${totalVal.toLocaleString()}`,
      threshold.toString(),
      status,
    ];
  });

  autoTable(doc, {
    startY: startY + 16,
    head: [['#', 'Barcode', 'Product Name', 'Category', 'Stock Qty', 'Unit Price', 'Total Value', 'Alert Level', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 46, fontStyle: 'bold' },
      3: { cellWidth: 24 },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const row = products[data.row.index];
        const threshold = row ? (row.low_stock_threshold || defaultThreshold) : defaultThreshold;
        if (row && row.stock_qty === 0) {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else if (row && row.stock_qty <= threshold) {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
  });

  addDocFooters(doc, storeConfig, themeRgb);
  doc.save(`stock_inventory_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportStockExcel(products: Product[], categories: Category[], storeConfig: StoreConfig) {
  const wb = XLSX.utils.book_new();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const defaultThreshold = storeConfig.low_stock_threshold || 10;

  const totalUnits = products.reduce((sum, p) => sum + p.stock_qty, 0);
  const totalValuation = products.reduce((sum, p) => sum + p.price * p.stock_qty, 0);

  const headerRows = [
    [storeConfig.store_name.toUpperCase()],
    [`Branch: ${storeConfig.branch}`, `Tel: ${storeConfig.phone_number}`, `Till: ${storeConfig.till_number}`],
    ['CURRENT INVENTORY VALUATION & STOCK LEVEL AUDIT', `Generated: ${new Date().toLocaleString('en-KE')}`],
    [],
    ['#', 'Barcode', 'Product Name', 'Category', 'Stock Qty', 'Unit', 'Selling Price (KES)', 'Total Inventory Value (KES)', 'Safety Reorder Level', 'Stock Status'],
  ];

  const dataRows = products.map((p, idx) => {
    const threshold = p.low_stock_threshold || defaultThreshold;
    let status = 'In Stock';
    if (p.stock_qty === 0) status = 'Out of Stock';
    else if (p.stock_qty <= threshold) status = 'Low Stock';

    return [
      idx + 1,
      p.barcode || '',
      p.name,
      catMap.get(p.category) || p.category || 'General',
      p.stock_qty,
      p.unit || 'btl',
      p.price,
      p.price * p.stock_qty,
      threshold,
      status,
    ];
  });

  const summaryRow = [
    'TOTALS',
    '',
    `${products.length} Products`,
    '',
    totalUnits,
    'units',
    '',
    totalValuation,
    '',
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], summaryRow]);

  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 16 }, // Barcode
    { wch: 32 }, // Product Name
    { wch: 18 }, // Category
    { wch: 12 }, // Stock Qty
    { wch: 8 },  // Unit
    { wch: 18 }, // Price
    { wch: 22 }, // Total Value
    { wch: 18 }, // Alert Level
    { wch: 14 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Inventory');
  XLSX.writeFile(wb, `inventory_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============================================================================
// 3. FINANCIAL / SALES REPORT EXPORT (PDF & EXCEL)
// ============================================================================

export function exportSalesReportPDF(
  sales: Sale[],
  storeConfig: StoreConfig,
  options?: { title?: string; dateRangeText?: string }
) {
  const reportTitle = options?.title || 'EXECUTIVE SALES & REVENUE REPORT';
  const rangeText = options?.dateRangeText || 'All Historical Records';

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const mpesaRevenue = sales.filter((s) => s.payment_method === 'MPESA').reduce((sum, s) => sum + s.total_amount, 0);
  const cashRevenue = sales.filter((s) => s.payment_method === 'CASH').reduce((sum, s) => sum + s.total_amount, 0);
  const creditRevenue = sales.filter((s) => s.payment_method === 'DEBT').reduce((sum, s) => sum + s.total_amount, 0);
  const averageSale = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    reportTitle,
    `Reporting Period: ${rangeText}  |  Total Completed Sales: ${sales.length}`
  );

  // Financial Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 18, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Gross Revenue: KES ${totalRevenue.toLocaleString()}`, 18, startY + 5);
  doc.text(`Average Basket: KES ${averageSale.toLocaleString()}`, 105, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald for M-Pesa
  doc.text(`• M-Pesa Total: KES ${mpesaRevenue.toLocaleString()} (${Math.round((mpesaRevenue / (totalRevenue || 1)) * 100)}%)`, 18, startY + 11);
  doc.setTextColor(30, 41, 59); // Cash
  doc.text(`• Cash Total: KES ${cashRevenue.toLocaleString()} (${Math.round((cashRevenue / (totalRevenue || 1)) * 100)}%)`, 75, startY + 11);
  doc.setTextColor(225, 29, 72); // Credit / Debt
  doc.text(`• Credit / Debt: KES ${creditRevenue.toLocaleString()} (${Math.round((creditRevenue / (totalRevenue || 1)) * 100)}%)`, 130, startY + 11);

  // Table of transactions in this period
  const tableBody = sales.map((s, idx) => {
    const d = new Date(s.created_at);
    const dateStr = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    // Client phone masked for privacy
    const maskedPhone = s.customer_phone ? maskPhoneNumber(s.customer_phone) : '';
    const customerLabel = s.customer_name ? `${s.customer_name}${maskedPhone ? ` (${maskedPhone})` : ''}` : 'Walk-in';

    return [
      (idx + 1).toString(),
      `RCP-${s.id.toString().slice(-6)}`,
      `${dateStr} ${timeStr}`,
      s.cashier_name,
      customerLabel,
      s.payment_method,
      s.mpesa_code || '-',
      `KES ${s.total_amount.toLocaleString()}`,
      s.debt_amount ? `Debt: KES ${s.debt_amount.toLocaleString()}` : 'PAID',
    ];
  });

  autoTable(doc, {
    startY: startY + 22,
    head: [['#', 'Receipt #', 'Date & Time', 'Cashier', 'Customer', 'Payment Mode', 'M-Pesa Ref', 'Amount', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 36 },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 17, halign: 'center' },
    },
  });

  addDocFooters(doc, storeConfig, themeRgb);
  doc.save(`sales_report_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportSalesReportExcel(
  sales: Sale[],
  storeConfig: StoreConfig,
  options?: { title?: string; dateRangeText?: string }
) {
  const wb = XLSX.utils.book_new();
  const reportTitle = options?.title || 'EXECUTIVE SALES & REVENUE REPORT';
  const rangeText = options?.dateRangeText || 'All Records';

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const mpesaRevenue = sales.filter((s) => s.payment_method === 'MPESA').reduce((sum, s) => sum + s.total_amount, 0);
  const cashRevenue = sales.filter((s) => s.payment_method === 'CASH').reduce((sum, s) => sum + s.total_amount, 0);
  const creditRevenue = sales.filter((s) => s.payment_method === 'DEBT').reduce((sum, s) => sum + s.total_amount, 0);

  const headerRows = [
    [storeConfig.store_name.toUpperCase()],
    [`Branch: ${storeConfig.branch}`, `Tel: ${storeConfig.phone_number}`, `Till: ${storeConfig.till_number}`],
    [reportTitle, `Period: ${rangeText}`, `Generated: ${new Date().toLocaleString('en-KE')}`],
    [],
    ['EXECUTIVE FINANCIAL SUMMARY'],
    ['Total Sales Count', sales.length],
    ['Gross Revenue (KES)', totalRevenue],
    ['M-Pesa Revenue (KES)', mpesaRevenue],
    ['Cash Revenue (KES)', cashRevenue],
    ['Credit / Debt Issued (KES)', creditRevenue],
    ['Average Sale Value (KES)', sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0],
    [],
    ['TRANSACTION RECORDS'],
    ['#', 'Receipt No', 'Date', 'Time', 'Cashier', 'Customer Name', 'Customer Phone (Privacy Masked)', 'Payment Method', 'M-Pesa Code', 'Gross Total (KES)', 'Amount Paid (KES)', 'Debt Balance (KES)', 'Payment Status'],
  ];

  const dataRows = sales.map((s, idx) => {
    const d = new Date(s.created_at);
    return [
      idx + 1,
      `RCP-${s.id.toString().slice(-6)}`,
      d.toLocaleDateString('en-KE'),
      d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      s.cashier_name,
      s.customer_name || 'Walk-in Customer',
      s.customer_phone ? maskPhoneNumber(s.customer_phone) : '',
      s.payment_method,
      s.mpesa_code || '',
      s.total_amount,
      s.amount_paid !== undefined ? s.amount_paid : s.total_amount,
      s.debt_amount || 0,
      s.payment_status || 'PAID',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);

  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 14 }, // Receipt
    { wch: 14 }, // Date
    { wch: 12 }, // Time
    { wch: 18 }, // Cashier
    { wch: 24 }, // Customer Name
    { wch: 20 }, // Masked Phone
    { wch: 16 }, // Method
    { wch: 16 }, // Mpesa Code
    { wch: 18 }, // Gross Total
    { wch: 18 }, // Paid
    { wch: 18 }, // Debt
    { wch: 16 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
  XLSX.writeFile(wb, `sales_report_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============================================================================
// 4. RECENT TRANSACTIONS JOURNAL EXPORT (PDF & EXCEL)
// ============================================================================

export function exportTransactionsPDF(
  sales: Sale[],
  saleItems: SaleItem[],
  storeConfig: StoreConfig,
  options?: { filterSummary?: string }
) {
  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    'RECENT TRANSACTIONS AUDIT JOURNAL',
    options?.filterSummary || `Listing of ${sales.length} verified transactions`
  );

  const totalRev = sales.reduce((sum, s) => sum + s.total_amount, 0);

  // Top metric bar
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 11, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Transactions: ${sales.length}`, 18, startY + 5);
  doc.text(`Total Volume: KES ${totalRev.toLocaleString()}`, 80, startY + 5);
  doc.text(`Cashiers: ${Array.from(new Set(sales.map((s) => s.cashier_name))).join(', ')}`, 140, startY + 5);

  const tableBody = sales.map((s, idx) => {
    const d = new Date(s.created_at);
    const masked = s.customer_phone ? maskPhoneNumber(s.customer_phone) : '';
    const cust = s.customer_name ? `${s.customer_name}${masked ? ` (${masked})` : ''}` : 'Walk-in';

    return [
      (idx + 1).toString(),
      `RCP-${s.id.toString().slice(-6)}`,
      d.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      s.cashier_name,
      cust,
      s.payment_method,
      s.mpesa_code || '-',
      `KES ${s.total_amount.toLocaleString()}`,
    ];
  });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'Receipt #', 'Timestamp', 'Cashier', 'Customer', 'Mode', 'M-Pesa Ref', 'Total Amount']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 },
      4: { cellWidth: 40 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
  });

  addDocFooters(doc, storeConfig, themeRgb);
  doc.save(`transactions_audit_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportTransactionsExcel(
  sales: Sale[],
  saleItems: SaleItem[],
  storeConfig: StoreConfig,
  options?: { filterSummary?: string }
) {
  const wb = XLSX.utils.book_new();

  // Create Item lookup
  const itemsBySale = new Map<number, SaleItem[]>();
  for (const item of saleItems) {
    const list = itemsBySale.get(item.sale_id) || [];
    list.push(item);
    itemsBySale.set(item.sale_id, list);
  }

  const headerRows = [
    [storeConfig.store_name.toUpperCase()],
    [`Branch: ${storeConfig.branch}`, `Tel: ${storeConfig.phone_number}`, `Till: ${storeConfig.till_number}`],
    ['DETAILED SALES & TRANSACTIONS JOURNAL', options?.filterSummary || '', `Generated: ${new Date().toLocaleString('en-KE')}`],
    [],
    ['#', 'Receipt No', 'Date', 'Time', 'Cashier', 'Customer Name', 'Customer Phone (Privacy Masked)', 'Payment Mode', 'M-Pesa Code', 'Items Purchased Details', 'Total Units', 'Total Amount (KES)', 'Status'],
  ];

  const dataRows = sales.map((s, idx) => {
    const d = new Date(s.created_at);
    const items = itemsBySale.get(s.id) || [];
    const itemsSummary = items.map((it) => `${it.product_name} (${it.quantity}x @ ${it.unit_price})`).join('; ');
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

    return [
      idx + 1,
      `RCP-${s.id.toString().slice(-6)}`,
      d.toLocaleDateString('en-KE'),
      d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      s.cashier_name,
      s.customer_name || 'Walk-in Customer',
      s.customer_phone ? maskPhoneNumber(s.customer_phone) : '',
      s.payment_method,
      s.mpesa_code || '',
      itemsSummary,
      totalUnits,
      s.total_amount,
      s.payment_status || 'COMPLETED',
    ];
  });

  const totalRev = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const summaryRow = ['TOTAL', '', '', '', '', '', '', '', '', '', '', totalRev, ''];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], summaryRow]);

  ws['!cols'] = [
    { wch: 6 },   // #
    { wch: 14 },  // Receipt
    { wch: 14 },  // Date
    { wch: 12 },  // Time
    { wch: 18 },  // Cashier
    { wch: 22 },  // Customer
    { wch: 20 },  // Masked Phone
    { wch: 14 },  // Mode
    { wch: 16 },  // M-Pesa Code
    { wch: 45 },  // Items details
    { wch: 12 },  // Units
    { wch: 18 },  // Total Amount
    { wch: 14 },  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions Journal');
  XLSX.writeFile(wb, `transactions_${storeConfig.store_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// 5. STOCK RESTOCK REQUISITION EXPORTS (PDF & EXCEL)
// ==========================================
export function exportRequisitionPDF(req: Requisition, storeConfig: StoreConfig) {
  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    'OFFICIAL STOCK RESTOCK REQUISITION',
    `Requisition Order No: ${req.requisition_no}  |  Urgency: ${req.urgency}`
  );

  const reqDate = new Date(req.created_at).toLocaleString('en-KE');

  // Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 22, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Requisition No: ${req.requisition_no}`, 18, startY + 5);
  doc.text(`Store / Branch: ${storeConfig.store_name} (${storeConfig.branch})`, 85, startY + 5);
  doc.text(`Status: ${req.status}`, 155, startY + 5);

  doc.text(`Requested By: ${req.requested_by_name} (${req.requested_by_role})`, 18, startY + 11);
  doc.text(`Date & Time: ${reqDate}`, 85, startY + 11);
  doc.text(`Urgency: ${req.urgency}`, 155, startY + 11);

  if (req.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Notes: ${req.notes.slice(0, 110)}${req.notes.length > 110 ? '...' : ''}`, 18, startY + 17);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Admin Contact: ${storeConfig.phone_number || 'N/A'} | Till: ${storeConfig.till_number}`, 18, startY + 17);
  }

  const tableBody = req.items.map((item, idx) => {
    const estCost = item.estimated_cost || 0;
    const estTotal = estCost * item.requested_qty;
    return [
      (idx + 1).toString(),
      item.product_name,
      item.category || 'Liquor',
      `${item.current_stock} ${item.unit}s`,
      `${item.requested_qty} ${item.unit}s`,
      estCost > 0 ? `KES ${estCost.toLocaleString()}` : '-',
      estTotal > 0 ? `KES ${estTotal.toLocaleString()}` : '-',
      '[   ]', // Checkbox for physical receiving verification
    ];
  });

  const totalQty = req.items.reduce((sum, it) => sum + it.requested_qty, 0);
  const totalCost = req.items.reduce((sum, it) => sum + ((it.estimated_cost || 0) * it.requested_qty), 0);

  autoTable(doc, {
    startY: startY + 26,
    head: [['#', 'Product Name', 'Category', 'In-Stock', 'Order Qty', 'Est. Unit Cost', 'Est. Total', 'Received [x]']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: themeRgb, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 13 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastY = (doc as any).lastAutoTable.finalY + 8;

  // Summary and signature block
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, lastY, 182, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Products: ${req.items.length}`, 18, lastY + 6.5);
  doc.text(`Total Units to Restock: ${totalQty}`, 70, lastY + 6.5);
  if (totalCost > 0) {
    doc.text(`Total Estimated Cost: KES ${totalCost.toLocaleString()}`, 130, lastY + 6.5);
  }

  // Signatures
  const sigY = lastY + 22;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Requested By: _________________________________', 18, sigY);
  doc.text('Approved By: _________________________________', 110, sigY);

  doc.text(`Name: ${req.requested_by_name}`, 18, sigY + 6);
  doc.text(`Date: ____________________`, 110, sigY + 6);

  doc.text('Delivery Checked & Received By: _______________________________   Date: ________________', 18, sigY + 14);

  doc.save(`${req.requisition_no}_${storeConfig.store_name.replace(/\s+/g, '_')}.pdf`);
}

export function exportRequisitionExcel(req: Requisition, storeConfig: StoreConfig) {
  const wb = XLSX.utils.book_new();

  const reqDate = new Date(req.created_at).toLocaleString('en-KE');

  const headerRows = [
    [storeConfig.store_name.toUpperCase(), ''],
    [`Branch: ${storeConfig.branch} | Phone: ${storeConfig.phone_number}`, ''],
    [`STOCK REQUISITION ORDER: ${req.requisition_no}`, ''],
    [`Date: ${reqDate} | Urgency: ${req.urgency} | Status: ${req.status}`, ''],
    [`Requested By: ${req.requested_by_name} (${req.requested_by_role})`, ''],
    req.notes ? [`Notes: ${req.notes}`, ''] : ['', ''],
    [],
    ['#', 'Product Name', 'Category', 'Current Stock', 'Requested Order Qty', 'Unit', 'Est. Unit Cost (KES)', 'Est. Total Cost (KES)', 'Received Status'],
  ];

  const dataRows = req.items.map((item, idx) => {
    const estCost = item.estimated_cost || 0;
    const estTotal = estCost * item.requested_qty;
    return [
      idx + 1,
      item.product_name,
      item.category || 'General',
      item.current_stock,
      item.requested_qty,
      item.unit || 'Bottle',
      estCost,
      estTotal,
      '',
    ];
  });

  const totalQty = req.items.reduce((sum, it) => sum + it.requested_qty, 0);
  const totalCost = req.items.reduce((sum, it) => sum + ((it.estimated_cost || 0) * it.requested_qty), 0);

  const summaryRow = ['TOTAL', '', '', '', totalQty, '', '', totalCost, ''];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], summaryRow]);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, req.requisition_no);
  XLSX.writeFile(wb, `${req.requisition_no}_${storeConfig.store_name.replace(/\s+/g, '_')}.xlsx`);
}

// =========================================================================
// SHIFT SUMMARY REPORT EXPORTS (PDF & EXCEL)
// =========================================================================

export function exportShiftReportPDF(report: ShiftSummaryReport, storeConfig: StoreConfig): void {
  const { doc, themeRgb, startY } = createStyledDoc(
    storeConfig,
    `SHIFT AUDIT & CASH RECONCILIATION: ${report.shift.id}`,
    `Cashier: ${report.shift.cashier_name} | Status: ${report.shift.status}`
  );

  const formatKes = (val: number) => `KES ${Math.round(val).toLocaleString()}`;
  const startDateStr = new Date(report.period.start).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const endDateStr = report.shift.closed_at
    ? new Date(report.shift.closed_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Still Active (Live Session)';

  // Metadata block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Shift Started: ${startDateStr}`, 14, startY + 2);
  doc.text(`Shift Ended: ${endDateStr}`, 14, startY + 7);
  doc.text(`Duration: ${Math.floor(report.period.duration_minutes / 60)}h ${report.period.duration_minutes % 60}m`, 110, startY + 2);
  doc.text(`Cashier: ${report.shift.cashier_name} ${report.shift.manager_name ? `• Manager: ${report.shift.manager_name}` : ''}`, 110, startY + 7);

  // Key KPI summary box
  const boxY = startY + 12;
  const colW = 35;
  const kpis = [
    { label: 'TOTAL SALES', value: formatKes(report.sales.total_amount), sub: `${report.sales.total_count} Orders` },
    { label: 'M-PESA TOTAL', value: formatKes(report.mpesa_transactions.total_amount), sub: `${report.mpesa_transactions.count} Payments` },
    { label: 'CASH SALES', value: formatKes(report.sales.cash_sales_amount), sub: `${report.sales.cash_sales_count} Transactions` },
    { label: 'NET CASH ADJ', value: formatKes(report.cash_adjustments.net_adjustment), sub: `+${formatKes(report.cash_adjustments.total_in)} / -${formatKes(report.cash_adjustments.total_out)}` },
    { label: 'DRAWER EXPECTED', value: formatKes(report.drawer_reconciliation.expected_cash_in_drawer), sub: `Opening Float: ${formatKes(report.drawer_reconciliation.opening_float)}` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colW + 2);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, boxY, colW, 18, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, colW, 18, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 2.5, boxY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 2.5, boxY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 2.5, boxY + 15);
  });

  // Table 1: Cash Drawer Balance & Reconciliation
  const reconRows = [
    ['Opening Cash Float (Drawer Start)', formatKes(report.drawer_reconciliation.opening_float), 'Initial float cash in till'],
    ['(+) Counter Cash Sales', formatKes(report.drawer_reconciliation.cash_sales), `${report.sales.cash_sales_count} cash sales collected`],
    ['(+) Cash Debt Repayments Collected', formatKes(report.drawer_reconciliation.cash_debt_collections), `${report.debt_repayments.count} customer ledger payments`],
    ['(+) Cash In Adjustments (Top-ups / In)', formatKes(report.drawer_reconciliation.cash_additions), `${report.cash_adjustments.items.filter(i => i.type === 'CASH_IN').length} addition records`],
    ['(-) Cash Out Adjustments (Drops / Payouts)', `-${formatKes(report.drawer_reconciliation.cash_drops_payouts)}`, `${report.cash_adjustments.items.filter(i => i.type === 'CASH_OUT').length} payouts & drops`],
    ['(=) EXPECTED PHYSICAL CASH IN DRAWER', formatKes(report.drawer_reconciliation.expected_cash_in_drawer), 'Expected cash calculated at register'],
  ];

  if (report.drawer_reconciliation.actual_counted_cash !== undefined) {
    reconRows.push([
      'Actual Cash Counted at Close',
      formatKes(report.drawer_reconciliation.actual_counted_cash),
      'Physical cash verified by manager',
    ]);
    const varianceVal = report.drawer_reconciliation.variance || 0;
    reconRows.push([
      varianceVal >= 0 ? 'Cash Surplus (Over)' : 'Cash Shortage (Short)',
      formatKes(Math.abs(varianceVal)),
      varianceVal === 0 ? 'PERFECT BALANCED' : varianceVal > 0 ? 'SURPLUS (+)' : 'SHORTAGE (-)',
    ]);
  }

  autoTable(doc, {
    startY: boxY + 23,
    head: [['Cash Drawer Item / Stream', 'Amount (KES)', 'Audit Notes & Breakdown']],
    body: reconRows,
    theme: 'grid',
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 67 },
    },
  });

  // Table 2: Cash Adjustments (Drops & Additions)
  const lastY = (doc as any).lastAutoTable.finalY || 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`CASH ADJUSTMENTS & DROPS (${report.cash_adjustments.count})`, 14, lastY + 8);

  const adjRows = report.cash_adjustments.items.map((adj, idx) => [
    idx + 1,
    new Date(adj.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
    adj.type === 'CASH_IN' ? 'CASH IN (+)' : 'CASH OUT (-)',
    adj.category.replace(/_/g, ' '),
    formatKes(adj.amount),
    adj.reason,
    adj.created_by_name,
    adj.authorized_by_manager || '-',
  ]);

  if (adjRows.length === 0) {
    adjRows.push(['-', '-', 'NONE', 'No cash adjustments recorded during this shift', 'KES 0', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: lastY + 11,
    head: [['#', 'Time', 'Type', 'Category', 'Amount', 'Reason / Description', 'Staff', 'Manager Auth']],
    body: adjRows,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 16 },
      2: { cellWidth: 20, fontStyle: 'bold' },
      3: { cellWidth: 28 },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 44 },
      6: { cellWidth: 22 },
      7: { cellWidth: 23 },
    },
  });

  // Table 3: M-Pesa Transactions Audit
  const mpesaTableY = (doc as any).lastAutoTable.finalY || 180;
  if (mpesaTableY > 230) {
    doc.addPage();
  }
  const currentY = mpesaTableY > 230 ? 20 : mpesaTableY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`M-PESA TRANSACTIONS AUDIT (${report.mpesa_transactions.count} Total: ${formatKes(report.mpesa_transactions.total_amount)})`, 14, currentY);

  const mpesaRows = report.mpesa_transactions.transactions.slice(0, 30).map((tx, idx) => [
    idx + 1,
    new Date(tx.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
    tx.sale_id ? `ORD-${tx.sale_id}` : 'DEBT-PAY',
    tx.mpesa_code || 'N/A',
    tx.customer_name || 'Walk-in Customer',
    tx.cashier_name,
    formatKes(tx.amount),
  ]);

  if (mpesaRows.length === 0) {
    mpesaRows.push(['-', '-', '-', 'No M-Pesa payments recorded during this shift', '-', '-', 'KES 0']);
  }

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Time', 'Ref #', 'M-Pesa Code', 'Customer', 'Cashier', 'Amount (KES)']],
    body: mpesaRows,
    theme: 'grid',
    headStyles: {
      fillColor: [22, 101, 52], // Green-800 for M-Pesa
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 46 },
      5: { cellWidth: 26 },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
  });

  addDocFooters(doc, storeConfig, themeRgb);
  doc.save(`shift_summary_${report.shift.id}_${storeConfig.store_name.replace(/\s+/g, '_')}.pdf`);
}

export function exportShiftReportExcel(report: ShiftSummaryReport, storeConfig: StoreConfig): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Shift Executive Summary & Cash Drawer
  const formatKesNum = (val: number) => Math.round(val);
  const summaryRows = [
    [storeConfig.store_name.toUpperCase(), ''],
    [`Branch: ${storeConfig.branch} | Till: ${storeConfig.till_number} | Phone: ${storeConfig.phone_number}`, ''],
    [`SHIFT SUMMARY AUDIT REPORT: ${report.shift.id}`, ''],
    [`Status: ${report.shift.status} | Cashier: ${report.shift.cashier_name} | Manager: ${report.shift.manager_name || 'N/A'}`, ''],
    [`Period: ${new Date(report.period.start).toLocaleString('en-KE')} to ${report.shift.closed_at ? new Date(report.shift.closed_at).toLocaleString('en-KE') : 'ACTIVE'}`, ''],
    [],
    ['KEY SHIFT TOTALS', 'AMOUNT (KES)', 'NOTES'],
    ['Total Gross Sales', formatKesNum(report.sales.total_amount), `${report.sales.total_count} Orders / ${report.sales.total_items_sold} Items`],
    ['Cash Counter Sales', formatKesNum(report.sales.cash_sales_amount), `${report.sales.cash_sales_count} Transactions`],
    ['M-Pesa Mobile Money Sales', formatKesNum(report.sales.mpesa_sales_amount), `${report.sales.mpesa_sales_count} Transactions`],
    ['Customer Debt / Credit Sales', formatKesNum(report.sales.debt_sales_amount), `${report.sales.debt_sales_count} Transactions`],
    ['Customer Debt Repayments (Cash)', formatKesNum(report.debt_repayments.total_cash), 'Collected at register'],
    ['Customer Debt Repayments (M-Pesa)', formatKesNum(report.debt_repayments.total_mpesa), 'Paid via M-Pesa'],
    ['Average Sale Ticket', formatKesNum(report.sales.average_ticket), 'Average revenue per transaction'],
    [],
    ['CASH DRAWER RECONCILIATION', 'AMOUNT (KES)', 'FORMULA / AUDIT NOTE'],
    ['Opening Cash Float', formatKesNum(report.drawer_reconciliation.opening_float), 'Starting cash in till drawer'],
    ['(+) Counter Cash Sales', formatKesNum(report.drawer_reconciliation.cash_sales), 'Cash received for sales'],
    ['(+) Cash Debt Repayments', formatKesNum(report.drawer_reconciliation.cash_debt_collections), 'Customer debt payments in cash'],
    ['(+) Cash In Additions', formatKesNum(report.drawer_reconciliation.cash_additions), 'Float top-ups & petty cash additions'],
    ['(-) Cash Drops & Payouts', -formatKesNum(report.drawer_reconciliation.cash_drops_payouts), 'Safe drops & vendor payouts'],
    ['(=) EXPECTED PHYSICAL CASH IN DRAWER', formatKesNum(report.drawer_reconciliation.expected_cash_in_drawer), 'Expected balance calculated'],
    ['Actual Cash Counted', report.drawer_reconciliation.actual_counted_cash !== undefined ? formatKesNum(report.drawer_reconciliation.actual_counted_cash) : 'NOT YET COUNTED', 'Manager physical count at close'],
    ['Cash Discrepancy / Variance', report.drawer_reconciliation.variance !== undefined ? formatKesNum(report.drawer_reconciliation.variance) : 'N/A', report.drawer_reconciliation.variance === 0 ? 'BALANCED' : 'SHORT / OVER'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Shift Summary');

  // Sheet 2: M-Pesa Transactions
  const mpesaHeader = [
    ['M-PESA TRANSACTIONS AUDIT', ''],
    [`Total Volume: KES ${report.mpesa_transactions.total_amount.toLocaleString()} | Count: ${report.mpesa_transactions.count}`, ''],
    [],
    ['#', 'Date & Time', 'Order / Ref #', 'M-Pesa Confirmation Code', 'Customer Name', 'Cashier', 'Amount (KES)'],
  ];

  const mpesaRows = report.mpesa_transactions.transactions.map((tx, idx) => [
    idx + 1,
    new Date(tx.created_at).toLocaleString('en-KE'),
    tx.sale_id ? `ORD-${tx.sale_id}` : 'DEBT-PAY',
    tx.mpesa_code || 'N/A',
    tx.customer_name || 'Walk-in Customer',
    tx.cashier_name,
    formatKesNum(tx.amount),
  ]);

  const wsMpesa = XLSX.utils.aoa_to_sheet([...mpesaHeader, ...mpesaRows]);
  wsMpesa['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 26 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMpesa, 'M-Pesa Transactions');

  // Sheet 3: Cash Adjustments
  const adjHeader = [
    ['CASH ADJUSTMENTS AUDIT (DROPS & ADDITIONS)', ''],
    [`Total Cash In: KES ${report.cash_adjustments.total_in.toLocaleString()} | Total Cash Out: KES ${report.cash_adjustments.total_out.toLocaleString()}`, ''],
    [],
    ['#', 'Date & Time', 'Type', 'Category', 'Amount (KES)', 'Reason / Description', 'Created By', 'Manager Approved'],
  ];

  const adjRows = report.cash_adjustments.items.map((adj, idx) => [
    idx + 1,
    new Date(adj.created_at).toLocaleString('en-KE'),
    adj.type,
    adj.category,
    formatKesNum(adj.amount),
    adj.reason,
    adj.created_by_name,
    adj.authorized_by_manager || 'None',
  ]);

  const wsAdj = XLSX.utils.aoa_to_sheet([...adjHeader, ...adjRows]);
  wsAdj['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 34 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsAdj, 'Cash Adjustments');

  XLSX.writeFile(wb, `shift_report_${report.shift.id}_${storeConfig.store_name.replace(/\s+/g, '_')}.xlsx`);
}


