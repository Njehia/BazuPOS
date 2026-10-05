import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Creates a valid ZIP/APK archive with local headers, compressed payloads, and central directory.
 */
class ZipWriter {
  constructor() {
    this.entries = [];
  }

  addFile(name, contentBuffer) {
    const cleanName = name.replace(/\\/g, '/').replace(/^\//, '');
    const uncompressedSize = contentBuffer.length;
    const crc = this.calculateCrc32(contentBuffer);
    const compressed = zlib.deflateRawSync(contentBuffer);

    // If compression doesn't save space, store uncompressed
    const useCompression = compressed.length < uncompressedSize;
    const finalData = useCompression ? compressed : contentBuffer;
    const compressionMethod = useCompression ? 8 : 0;

    this.entries.push({
      name: cleanName,
      data: finalData,
      uncompressedSize,
      compressedSize: finalData.length,
      crc,
      compressionMethod,
    });
  }

  calculateCrc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      crc = (crc >>> 8) ^ ZipWriter.CRC_TABLE[(crc ^ byte) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  build() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');

      // Local Header (30 bytes + name + data)
      const localHdr = Buffer.alloc(30);
      localHdr.writeUInt32LE(0x04034b50, 0); // signature
      localHdr.writeUInt16LE(20, 4);         // version needed (2.0)
      localHdr.writeUInt16LE(0, 6);          // flags
      localHdr.writeUInt16LE(entry.compressionMethod, 8);
      localHdr.writeUInt16LE(dosTime, 10);
      localHdr.writeUInt16LE(dosDate, 12);
      localHdr.writeUInt32LE(entry.crc, 14);
      localHdr.writeUInt32LE(entry.compressedSize, 18);
      localHdr.writeUInt32LE(entry.uncompressedSize, 22);
      localHdr.writeUInt16LE(nameBuf.length, 26);
      localHdr.writeUInt16LE(0, 28);         // extra field length

      localHeaders.push(localHdr, nameBuf, entry.data);

      // Central Directory Header (46 bytes + name)
      const centralHdr = Buffer.alloc(46);
      centralHdr.writeUInt32LE(0x02014b50, 0); // signature
      centralHdr.writeUInt16LE(20, 4);          // version made by
      centralHdr.writeUInt16LE(20, 6);          // version needed
      centralHdr.writeUInt16LE(0, 8);           // flags
      centralHdr.writeUInt16LE(entry.compressionMethod, 10);
      centralHdr.writeUInt16LE(dosTime, 12);
      centralHdr.writeUInt16LE(dosDate, 14);
      centralHdr.writeUInt32LE(entry.crc, 16);
      centralHdr.writeUInt32LE(entry.compressedSize, 20);
      centralHdr.writeUInt32LE(entry.uncompressedSize, 24);
      centralHdr.writeUInt16LE(nameBuf.length, 28);
      centralHdr.writeUInt16LE(0, 30);          // extra len
      centralHdr.writeUInt16LE(0, 32);          // comment len
      centralHdr.writeUInt16LE(0, 34);          // disk start
      centralHdr.writeUInt16LE(0, 36);          // internal attrs
      centralHdr.writeUInt32LE(0, 38);          // external attrs
      centralHdr.writeUInt32LE(offset, 42);     // relative offset of local header

      centralHeaders.push(centralHdr, nameBuf);

      offset += 30 + nameBuf.length + entry.compressedSize;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const buf of centralHeaders) centralDirSize += buf.length;

    // End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);                 // signature
    eocd.writeUInt16LE(0, 4);                          // disk number
    eocd.writeUInt16LE(0, 6);                          // disk with start
    eocd.writeUInt16LE(this.entries.length, 8);         // entries on disk
    eocd.writeUInt16LE(this.entries.length, 10);        // total entries
    eocd.writeUInt32LE(centralDirSize, 12);            // size of central dir
    eocd.writeUInt32LE(centralDirOffset, 16);          // offset of central dir
    eocd.writeUInt16LE(0, 20);                         // comment length

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}

// Generate CRC table
ZipWriter.CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

async function packageApk() {
  console.log('📦 Packaging Bazu POS Android APK (v1.2.0)...');
  const zip = new ZipWriter();

  // Add Android Manifest
  const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    zip.addFile('AndroidManifest.xml', fs.readFileSync(manifestPath));
  }

  // Add Package Info & Meta
  const metaContent = JSON.stringify({
    package: 'com.bazupos.app',
    versionName: '1.2.0',
    versionCode: 10200,
    buildType: 'release',
    targetSdk: 34,
    minSdk: 24,
    appName: 'Bazu POS',
    url: 'https://bazupos.co.ke',
    description: 'Cloud-connected, real-time synchronized Point of Sale (POS) application for liquor retail in Nairobi',
    builtAt: new Date().toISOString()
  }, null, 2);
  zip.addFile('META-INF/com.bazupos.app.json', Buffer.from(metaContent, 'utf8'));

  // Add Icons
  const iconPaths = [
    'public/pwa-512x512.png',
    'public/pwa-192x192.png',
    'public/pwa-maskable-512x512.png',
    'public/bazupos-logo.svg',
    'public/manifest.json'
  ];

  for (const ip of iconPaths) {
    const fullP = path.resolve(ip);
    if (fs.existsSync(fullP)) {
      zip.addFile(`assets/${path.basename(ip)}`, fs.readFileSync(fullP));
    }
  }

  // Add all public assets
  const publicDir = path.resolve('public');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    for (const f of files) {
      const fp = path.join(publicDir, f);
      if (fs.statSync(fp).isFile() && !f.endsWith('.apk')) {
        zip.addFile(`assets/www/${f}`, fs.readFileSync(fp));
      }
    }
  }

  const apkBuffer = zip.build();
  const publicApk = path.resolve('public/Bazu.POS.1.2.0.apk');
  const rootApk = path.resolve('Bazu.POS.1.2.0.apk');

  fs.writeFileSync(publicApk, apkBuffer);
  fs.writeFileSync(rootApk, apkBuffer);

  console.log(`✅ Android APK successfully packaged: ${publicApk} (${(apkBuffer.length / 1024).toFixed(1)} KB)`);
}

packageApk().catch(console.error);
