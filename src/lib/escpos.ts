/**
 * ESC/POS Thermal Hardware Driver & Barcode Audio Utility
 * Provides Web Bluetooth, WebUSB, ESC/POS byte generation for 58mm & 80mm printers,
 * cash drawer kick commands, and hardware scanner sound synthesized via Web Audio API.
 */

import { Sale, SaleItem, StoreConfig, ShiftSummaryReport } from '../types';

export interface ESCPOSReceiptData {
  storeConfig: StoreConfig;
  sale: Sale;
  items: SaleItem[];
  reprint?: boolean;
}

export class ESCPOSBuilder {
  private buffer: number[] = [];
  private charsPerLine: number;

  constructor(paperWidth: '58mm' | '80mm' = '80mm') {
    this.charsPerLine = paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  setBold(bold: boolean): this {
    this.buffer.push(0x1b, 0x45, bold ? 0x01 : 0x00); // ESC E
    return this;
  }

  setDoubleSize(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS !
    return this;
  }

  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i) & 0xff);
    }
    return this;
  }

  textLine(str: string): this {
    this.text(str);
    this.feed(1);
    return this;
  }

  divider(char: string = '-'): this {
    const line = char.repeat(this.charsPerLine);
    this.textLine(line);
    return this;
  }

  twoColumnRow(left: string, right: string): this {
    const maxLeft = this.charsPerLine - right.length - 1;
    const cleanLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
    const spaces = Math.max(1, this.charsPerLine - cleanLeft.length - right.length);
    const row = cleanLeft + ' '.repeat(spaces) + right;
    this.textLine(row);
    return this;
  }

  cut(): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, 0x42, 0x00); // GS V B 0 (Partial cut with feed)
    return this;
  }

  openDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // Pulse to kick drawer
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export function buildESCPOSThermalReceipt(data: ESCPOSReceiptData): Uint8Array {
  const width = data.storeConfig.receipt_printer_width || '80mm';
  const builder = new ESCPOSBuilder(width);

  // Header
  builder.alignCenter();
  builder.setBold(true);
  builder.setDoubleSize(true);
  builder.textLine(data.storeConfig.store_name || 'BAZU POS');
  builder.setDoubleSize(false);

  if (data.storeConfig.branch) {
    builder.textLine(data.storeConfig.branch);
  }
  if (data.storeConfig.phone_number) {
    builder.textLine(`Tel: ${data.storeConfig.phone_number}`);
  }
  if (data.storeConfig.till_number) {
    builder.textLine(`Till / Paybill: ${data.storeConfig.till_number}`);
  }

  builder.divider('=');

  // Metadata
  builder.alignLeft();
  builder.setBold(false);
  builder.twoColumnRow('Receipt #:', `RCP-${data.sale.id.toString().slice(-6)}`);
  builder.twoColumnRow('Date/Time:', new Date(data.sale.created_at).toLocaleString('en-KE').slice(0, 19));
  builder.twoColumnRow('Cashier:', data.sale.cashier_name);

  if (data.sale.customer_name) {
    builder.twoColumnRow('Customer:', data.sale.customer_name);
  }

  builder.divider('-');

  // Column Header
  builder.setBold(true);
  builder.twoColumnRow('ITEM DESCRIPTION', 'TOTAL (KES)');
  builder.setBold(false);
  builder.divider('-');

  // Line items
  for (const item of data.items) {
    const itemTotal = `KES ${(item.total_price || item.unit_price * item.quantity).toLocaleString()}`;
    builder.setBold(true);
    builder.twoColumnRow(item.product_name, itemTotal);
    builder.setBold(false);

    const qtyDetail = `  ${item.quantity} x KES ${item.unit_price.toLocaleString()}`;
    const extra = item.variant_name ? ` (${item.variant_name})` : '';
    builder.textLine(qtyDetail + extra);

    if (item.notes) {
      builder.textLine(`  Note: ${item.notes}`);
    }
  }

  builder.divider('-');

  // Totals
  builder.setBold(true);
  builder.twoColumnRow('TOTAL AMOUNT:', `KES ${data.sale.total_amount.toLocaleString()}`);
  builder.setBold(false);

  if (data.sale.discount_amount && data.sale.discount_amount > 0) {
    builder.twoColumnRow('Discount Savings:', `- KES ${data.sale.discount_amount.toLocaleString()}`);
  }

  builder.divider('-');

  // Payment Breakdown
  builder.twoColumnRow('Payment Method:', data.sale.payment_method);
  if (data.sale.payment_method === 'SPLIT') {
    if (data.sale.split_cash_amount) {
      builder.twoColumnRow('  - Cash Portion:', `KES ${data.sale.split_cash_amount.toLocaleString()}`);
    }
    if (data.sale.split_mpesa_amount) {
      builder.twoColumnRow('  - M-Pesa Portion:', `KES ${data.sale.split_mpesa_amount.toLocaleString()}`);
    }
  }

  if (data.sale.mpesa_code) {
    builder.twoColumnRow('M-Pesa Trans ID:', data.sale.mpesa_code);
  }

  if (data.sale.cash_tendered !== undefined && data.sale.payment_method === 'CASH') {
    builder.twoColumnRow('Cash Tendered:', `KES ${data.sale.cash_tendered.toLocaleString()}`);
    builder.twoColumnRow('Change Given:', `KES ${(data.sale.change_given || 0).toLocaleString()}`);
  }

  // Footer Disclaimer
  builder.feed(1);
  builder.alignCenter();
  if (data.storeConfig.receipt_footer) {
    data.storeConfig.receipt_footer.split('\n').forEach((line) => {
      builder.textLine(line);
    });
  } else {
    builder.textLine('Thank you for your business! Karibu tena.');
  }

  builder.feed(1);
  builder.textLine('Powered by Bazu POS');
  builder.cut();

  return builder.getBytes();
}

/**
 * Web Bluetooth Thermal Printer Connection & Print
 */
export async function printViaWebBluetooth(receiptData: ESCPOSReceiptData): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth is not supported in this browser. Use Chrome, Edge, or standard Print.',
    };
  }

  try {
    const rawBytes = buildESCPOSThermalReceipt(receiptData);

    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { namePrefix: 'POS' },
        { namePrefix: 'Printer' },
        { namePrefix: 'MPT' },
        { namePrefix: 'RPP' },
        { namePrefix: 'BlueTooth' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ],
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Could not establish GATT connection with Bluetooth printer');

    // Find printable characteristic
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          writeChar = ch;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('No writable ESC/POS characteristic found on device.');
    }

    // Chunk bytes (max 512 bytes per packet for Bluetooth LE)
    const CHUNK_SIZE = 128;
    for (let offset = 0; offset < rawBytes.length; offset += CHUNK_SIZE) {
      const chunk = rawBytes.slice(offset, offset + CHUNK_SIZE);
      await writeChar.writeValue(chunk);
    }

    return { success: true, message: `Printed successfully to ${device.name || 'Bluetooth Printer'}` };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'Printer selection was cancelled.' };
    }
    return { success: false, message: err?.message || 'Failed to print via Bluetooth' };
  }
}

/**
 * WebUSB Thermal Printer Connection & Print
 */
export async function printViaWebUSB(receiptData: ESCPOSReceiptData): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).usb) {
    return {
      success: false,
      message: 'WebUSB is not supported in this browser. Use Chrome or Edge.',
    };
  }

  try {
    const rawBytes = buildESCPOSThermalReceipt(receiptData);
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const iface = device.configuration.interfaces.find((i: any) =>
      i.alternates.some((alt: any) =>
        alt.endpoints.some((ep: any) => ep.direction === 'out')
      )
    ) || device.configuration.interfaces[0];

    if (!iface) throw new Error('No compatible printer interface found on USB device.');
    await device.claimInterface(iface.interfaceNumber);

    const alt = iface.alternates[0];
    const outEndpoint = alt.endpoints.find((ep: any) => ep.direction === 'out');
    if (!outEndpoint) throw new Error('No OUT endpoint found on USB printer.');

    await device.transferOut(outEndpoint.endpointNumber, rawBytes.buffer);
    await device.releaseInterface(iface.interfaceNumber);
    await device.close();

    return {
      success: true,
      message: `Printed successfully to ${device.productName || 'USB Thermal Printer'}`,
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'USB printer selection was cancelled.' };
    }
    return { success: false, message: err?.message || 'Failed to print via WebUSB' };
  }
}

/**
 * Build ESC/POS bytes for End-of-Day X or Z Shift Reports
 */
export function buildESCPOSShiftReport(
  report: ShiftSummaryReport,
  reportType: 'X' | 'Z',
  storeConfig: StoreConfig
): Uint8Array {
  const paperWidth = storeConfig.receipt_printer_width || '80mm';
  const builder = new ESCPOSBuilder(paperWidth);

  builder.alignCenter();
  builder.setBold(true);
  builder.textLine(storeConfig.store_name.toUpperCase());
  builder.setBold(false);
  builder.textLine(storeConfig.branch);
  builder.textLine(`M-Pesa Till: ${storeConfig.till_number}`);
  builder.divider('=');

  builder.setBold(true);
  builder.setDoubleSize(true);
  builder.textLine(reportType === 'Z' ? 'FINAL Z-REPORT' : 'MID-SHIFT X-REPORT');
  builder.setDoubleSize(false);
  builder.setBold(false);

  builder.textLine(
    reportType === 'Z' ? 'END-OF-DAY CLOSING AUDIT' : 'MID-DAY REGISTER SNAPSHOT'
  );
  builder.divider('-');

  builder.alignLeft();
  builder.twoColumnRow('Shift Ref:', `SH-${report.shift.id.toString().slice(-6)}`);
  builder.twoColumnRow('Cashier:', report.shift.cashier_name);
  builder.twoColumnRow('Opened:', new Date(report.shift.opened_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
  if (report.shift.closed_at) {
    builder.twoColumnRow('Closed:', new Date(report.shift.closed_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
  }
  builder.twoColumnRow('Printed:', new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));

  builder.divider('-');
  builder.setBold(true);
  builder.textLine('SALES BREAKDOWN');
  builder.setBold(false);
  builder.twoColumnRow('Cash Sales:', `KES ${report.sales.cash_sales_amount.toLocaleString()}`);
  builder.twoColumnRow('M-Pesa Express:', `KES ${report.sales.mpesa_sales_amount.toLocaleString()}`);
  if (report.sales.split_sales_amount > 0) {
    builder.twoColumnRow('Split Tender:', `KES ${report.sales.split_sales_amount.toLocaleString()}`);
  }
  if (report.sales.debt_sales_amount > 0) {
    builder.twoColumnRow('Debt/Credit:', `KES ${report.sales.debt_sales_amount.toLocaleString()}`);
  }
  builder.divider('-');
  builder.setBold(true);
  builder.twoColumnRow('TOTAL GROSS SALES:', `KES ${report.sales.total_amount.toLocaleString()}`);
  builder.twoColumnRow('Transactions Count:', `${report.sales.total_count}`);
  builder.twoColumnRow('Items Sold:', `${report.sales.total_items_sold}`);
  builder.setBold(false);

  builder.divider('-');
  builder.setBold(true);
  builder.textLine('CASH DRAWER RECONCILIATION');
  builder.setBold(false);
  builder.twoColumnRow('Opening Float:', `KES ${report.drawer_reconciliation.opening_float.toLocaleString()}`);
  builder.twoColumnRow('+ Cash Sales:', `KES ${report.drawer_reconciliation.cash_sales.toLocaleString()}`);
  if (report.drawer_reconciliation.cash_debt_collections > 0) {
    builder.twoColumnRow('+ Debt Collected:', `KES ${report.drawer_reconciliation.cash_debt_collections.toLocaleString()}`);
  }
  if (report.drawer_reconciliation.cash_additions > 0) {
    builder.twoColumnRow('+ Cash In (Pay-in):', `KES ${report.drawer_reconciliation.cash_additions.toLocaleString()}`);
  }
  if (report.drawer_reconciliation.cash_drops_payouts > 0) {
    builder.twoColumnRow('- Safe Drop / Out:', `KES ${report.drawer_reconciliation.cash_drops_payouts.toLocaleString()}`);
  }
  builder.divider('-');
  builder.setBold(true);
  builder.twoColumnRow('EXPECTED IN DRAWER:', `KES ${report.drawer_reconciliation.expected_cash_in_drawer.toLocaleString()}`);
  if (report.drawer_reconciliation.actual_counted_cash !== undefined) {
    builder.twoColumnRow('ACTUAL COUNTED:', `KES ${report.drawer_reconciliation.actual_counted_cash.toLocaleString()}`);
    const variance = report.drawer_reconciliation.variance || 0;
    builder.twoColumnRow('VARIANCE (OVER/SHORT):', `KES ${variance >= 0 ? '+' : ''}${variance.toLocaleString()}`);
  }
  builder.setBold(false);

  builder.feed(2);
  builder.alignCenter();
  builder.textLine('--------------------------------');
  builder.textLine('Cashier Signature');
  builder.feed(1);
  builder.textLine('--------------------------------');
  builder.textLine('Manager / Auditor Signature');
  builder.feed(2);
  builder.textLine('Powered by Bazu POS • Verified');
  builder.cut();

  return builder.getBytes();
}

/**
 * Web Audio API synthesizer for Barcode Scanner Success Beep
 * Zero external audio assets required.
 */
export function playScannerSuccessBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch A6 beep
    osc.frequency.setValueAtTime(2349, ctx.currentTime + 0.05); // Crisp D7 chime

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Non-blocking sound
  }
}
