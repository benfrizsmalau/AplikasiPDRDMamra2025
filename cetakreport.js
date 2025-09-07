// cetakreport.js
// Modul export PDF untuk report.html
// Menggunakan jsPDF & html2canvas

// Pastikan jsPDF & html2canvas sudah di-load di HTML sebelum file ini

async function exportReportToPDF({
  reportType = 'laporan-pendapatan',
  kopDinasUrl = 'images/logo.png',
  namaDinas = 'PEMERINTAH KABUPATEN/KOTA',
  namaLaporan = 'Laporan Pendapatan',
  ttdNama = '',
  ttdNip = ''
} = {}) {
  // Ambil elemen laporan yang ingin di-export
  const reportSection = document.getElementById(reportType);
  if (!reportSection) {
    alert('Bagian laporan tidak ditemukan!');
    return;
  }

  // Buat canvas dari elemen laporan
  const canvas = await html2canvas(reportSection, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  // Siapkan dokumen PDF
  const pdf = new window.jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Ukuran A4: 210 x 297 mm
  const pageWidth = 210;
  let y = 15;

  // Kop dinas & logo
  if (kopDinasUrl) {
    try {
      const img = new Image();
      img.src = kopDinasUrl;
      await img.decode();
      pdf.addImage(img, 'PNG', 15, y, 20, 20);
    } catch (e) {
      // Logo gagal dimuat, lanjutkan tanpa logo
    }
  }
  pdf.setFontSize(14);
  pdf.text(namaDinas, pageWidth / 2, y + 8, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(namaLaporan, pageWidth / 2, y + 16, { align: 'center' });
  y += 28;

  // Gambar isi laporan (tabel)
  const imgWidth = pageWidth - 30;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
  y += imgHeight + 10;

  // Tanda tangan
  pdf.setFontSize(11);
  pdf.text('Mengetahui,', pageWidth - 80, y + 10);
  pdf.text('Kepala Dinas', pageWidth - 80, y + 16);
  pdf.text(' ', pageWidth - 80, y + 28);
  pdf.text('Nama: ' + (ttdNama || '..................'), pageWidth - 80, y + 38);
  pdf.text('NIP: ' + (ttdNip || '..................'), pageWidth - 80, y + 44);

  // Simpan PDF
  pdf.save(`${namaLaporan.replace(/\s+/g, '_')}.pdf`);
}

// Fungsi utama export PDF laporan pendapatan
async function exportPendapatanToPDF({
  reportData,
  periodeLabel = '',
  tahun = '2025',
  startDate,
  endDate
}) {
  // Siapkan data sumber
  const masterList = reportData.masterPajak || [];
  const targetList = (reportData.targetPajakRetribusi || []).filter(t => String(t.Tahun) === String(tahun));
  const pembayaranList = (reportData.pembayaran || []).filter(p => {
    if (!p.TanggalBayar) return false;
    const tgl = new Date(p.TanggalBayar);
    return tgl.getFullYear() === Number(tahun) && (!startDate || !endDate || (tgl >= startDate && tgl <= endDate));
  });

  // Hitung realisasi per kode layanan
  const realisasiByKode = {};
  pembayaranList.forEach(p => {
    if (p.StatusPembayaran !== 'Sukses') return;
    const ketetapan = (reportData.ketetapan || []).find(k => k.ID_Ketetapan === p.ID_Ketetapan);
    if (!ketetapan) return;
    const kode = ketetapan.KodeLayanan;
    if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
    realisasiByKode[kode] += parseFloat(p.JumlahBayar) || 0;
  });

  // Hitung target per kode layanan
  const targetByKode = {};
  targetList.forEach(t => {
    targetByKode[t.KodeLayanan] = (parseFloat(t.Target) || 0);
  });

  // Siapkan data tabel
  const rows = masterList.map((row, idx) => {
    const kode = row.KodeLayanan;
    const nama = row.NamaLayanan;
    const target = targetByKode[kode] || 0;
    const realisasi = realisasiByKode[kode] || 0;
    const kontribusi = 0; // Akan dihitung setelah total realisasi diketahui
    const capaian = target > 0 ? (realisasi / target * 100) : 0;
    return { idx: idx + 1, kode, nama, target, realisasi, kontribusi, capaian };
  });
  // Hitung total realisasi
  const totalRealisasi = rows.reduce((sum, r) => sum + r.realisasi, 0);
  const totalTarget = rows.reduce((sum, r) => sum + r.target, 0);
  // Hitung kontribusi per baris
  rows.forEach(r => {
    r.kontribusi = totalRealisasi > 0 ? (r.realisasi / totalRealisasi * 100) : 0;
  });
  // Hitung rata-rata capaian
  const rataCapaian = rows.filter(r => r.target > 0).reduce((sum, r) => sum + r.capaian, 0) / (rows.filter(r => r.target > 0).length || 1);

  // Siapkan jsPDF landscape
  const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  let y = 18;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y - 5, 22, 22);
  } catch (e) { /* logo gagal dimuat, lanjut tanpa logo */ }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y, { align: 'center' });
  y += 5;
  pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;
  pdf.setLineWidth(1.2);
  pdf.line(15, y, pageWidth - 15, y);
  y += 7;

  // Judul laporan & periode
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('LAPORAN REALISASI PENERIMAAN PENDAPATAN ASLI DAERAH (PAD)', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header
  // Kolom proporsional untuk landscape (disesuaikan agar angka muat)
  // Geser kolom Target (dan isian) 10mm ke kiri
  // Perlebar border kolom Kontribusi (%) 15mm ke kanan, header & isi tetap
  // Perlebar border kolom Capaian (%) 15mm ke kanan, header & isi digeser 15mm ke kanan
  // Geser header & isi kolom Capaian (%) 10mm ke kiri
  const colX = [15, 27, 47, 119, 156, 193, 232]; // border tetap
  const colW = [10, 18, 80, 35, 35, 37, 37];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('Kode', colX[1] + colW[1] / 2 - 2, yPos, { align: 'center' }); // header kode 2mm ke kiri
    pdf.text('Uraian Pajak/Retribusi', colX[2] + 2, yPos, { align: 'left' });
    pdf.text('Target (Rp)', colX[3] + colW[3] - 2, yPos, { align: 'right' });
    pdf.text('Realisasi (Rp)', colX[4] + colW[4] - 2, yPos, { align: 'right' });
    pdf.text('Kontribusi (%)', colX[5] + colW[5] - 2, yPos, { align: 'right' });
    pdf.text('Capaian (%)', colX[6] + colW[6] - 2 - 10, yPos, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
  }

  function drawTableRow(r, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(r.idx), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.kode, colX[1] + colW[1] / 2 - 2, yPos, { align: 'center' }); // isi kode 2mm ke kiri
    let uraian = r.nama.length > 45 ? r.nama.slice(0, 43) + '…' : r.nama;
    pdf.text(uraian, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(formatRupiahPdf(r.target), colX[3] + colW[3] - 2 + 2, yPos, { align: 'right', maxWidth: colW[3] - 4 });
    pdf.text(formatRupiahPdf(r.realisasi), colX[4] + colW[4] - 2, yPos, { align: 'right', maxWidth: colW[4] - 4 });
    pdf.text(r.kontribusi.toFixed(1), colX[5] + colW[5] - 2, yPos, { align: 'right', maxWidth: colW[5] - 4 });
    pdf.text(r.capaian.toFixed(1), colX[6] + colW[6] - 2 - 10, yPos, { align: 'right', maxWidth: colW[6] - 4 });
  }

  // Format angka pendek tanpa koma desimal jika tidak perlu, tanpa 'Rp'
  function formatRupiahPdfShort(angka) {
    if (!angka || isNaN(angka)) return '0';
    let str = Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    return str;
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  rows.forEach(r => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, y);
    y += rowHeight;
  });

  // Baris total
  if (y > maxY) {
    pdf.addPage();
    y = 18;
    drawTableHeader(y);
    y += rowHeight;
  }
  // Baris total dengan border
  let x = colX[0];
  for (let i = 0; i < colW.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colW[i], rowHeight, 'S');
    x += colW[i];
  }
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', colX[2] + 2, y, { align: 'left' });
  pdf.text(formatRupiahPdf(totalTarget), colX[3] + colW[3] - 2 + 2, y, { align: 'right' });
  pdf.text(formatRupiahPdf(totalRealisasi), colX[4] + colW[4] - 2, y, { align: 'right' });
  pdf.text('100.0', colX[5] + colW[5] - 2, y, { align: 'right' });
  pdf.text(rataCapaian.toFixed(1), colX[6] + colW[6] - 2 - 10, y, { align: 'right' });
  y += 10;

  // Penutup
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  // Geser tanggal ke kiri tepat di bawah pertemuan kolom Realisasi dan Kontribusi
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  // Tulisan Dibuat di : tepat di bawah tanggal
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  // Blok An., Pengelolaan Keuangan, Kepala Bidang, Nama, NIP di bawah Dibuat di
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('KEPALA BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('NAMA.', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP.', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Pendapatan_PAD.pdf');
}

// Helper format rupiah untuk PDF
function formatRupiahPdf(angka) {
  if (!angka) return 'Rp 0';
  return 'Rp ' + Number(angka).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

// Helper format tanggal cetak
function formatTanggalCetak(date) {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

// Fungsi export PDF untuk Laporan Ketetapan
async function exportKetetapanToPDF({
  reportData,
  startDate,
  endDate,
  filterByDate = true
}) {
  // Filter data ketetapan berdasarkan tanggal ketetapan
  let ketetapanData = reportData.ketetapan || [];

  if (filterByDate && startDate && endDate) {
    ketetapanData = ketetapanData.filter(k => {
      if (!k.TanggalKetetapan) return false;
      const tglKetetapan = new Date(k.TanggalKetetapan);
      return tglKetetapan >= startDate && tglKetetapan <= endDate;
    });
  }

  // Urutkan berdasarkan tanggal ketetapan (terlama dulu - ascending)
  ketetapanData.sort((a, b) => {
    const dateA = new Date(a.TanggalKetetapan || '1970-01-01');
    const dateB = new Date(b.TanggalKetetapan || '1970-01-01');
    return dateA - dateB; // Ascending order (oldest first)
  });

  console.log('=== KETETAPAN DATA SORTING ===');
  console.log('Total records before sorting:', ketetapanData.length);
  console.log('First record date:', ketetapanData[0]?.TanggalKetetapan);
  console.log('Last record date:', ketetapanData[ketetapanData.length - 1]?.TanggalKetetapan);

  // Siapkan jsPDF landscape untuk F4 (210 x 330 mm)
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 330] // F4 landscape
  });

  const pageWidth = 330;
  const pageHeight = 210;
  let y = 15;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y, 20, 20);
  } catch (e) {
    // Logo gagal dimuat, lanjutkan tanpa logo
  }

  // Header instansi
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
  y += 10;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Alamat kantor
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Garis pemisah
  pdf.setLineWidth(1);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Judul laporan
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('LAPORAN DATA KETETAPAN PAJAK', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Periode laporan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  let periodeText = 'Semua Periode';
  if (filterByDate && startDate && endDate) {
    const startStr = formatTanggalCetak(startDate);
    const endStr = formatTanggalCetak(endDate);
    periodeText = `${startStr} s/d ${endStr}`;
  }
  pdf.text(`Periode Ketetapan: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Info jumlah data
  pdf.setFontSize(10);
  pdf.text(`Total Data: ${ketetapanData.length} Ketetapan`, 15, y);
  y += 8;

  // Tabel header - 9 kolom dengan lebar proporsional untuk F4
  // Improved column widths to better utilize F4 paper space (330mm width)
  // Previous: [12, 25, 25, 35, 25, 30, 25, 30, 20] = 227mm (wasted space)
  // New: [15, 25, 30, 45, 25, 35, 30, 35, 25] = 265mm (better utilization)
  const colWidths = [15, 25, 30, 45, 25, 35, 30, 35, 25]; // Total: 265mm (dari 330mm dengan margin)
  const colX = [15]; // Start position
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i-1] + colWidths[i-1]);
  }

  const headers = [
    'No',
    'Tanggal Ketetapan',
    'ID Ketetapan',
    'Nama Usaha',
    'NPWPD',
    'Jenis Pajak',
    'Masa Pajak',
    'Total Tagihan',
    'Status'
  ];

  const rowHeight = 8;
  const maxY = pageHeight - 30; // Leave space for footer

  // Draw table header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setFillColor(240, 240, 240);

  // Header background
  let x = colX[0];
  for (let i = 0; i < colWidths.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
    x += colWidths[i];
  }

  // Header text
  x = colX[0];
  for (let i = 0; i < headers.length; i++) {
    const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
    pdf.text(lines, x + 1, y - 1);
    x += colWidths[i];
  }

  y += rowHeight;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);

  for (let i = 0; i < ketetapanData.length; i++) {
    const ket = ketetapanData[i];

    // Cari data wajib pajak untuk nama usaha
    const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === ket.NPWPD);
    const namaUsaha = wpData?.['Nama Usaha'] || '-';

    // Cari nama jenis pajak dari master pajak
    const masterPajak = reportData.masterPajak?.find(mp => mp.KodeLayanan === ket.KodeLayanan);
    const jenisPajak = masterPajak?.NamaLayanan || ket.KodeLayanan || '-';

    // Check if we need a new page
    if (y + rowHeight > maxY) {
      // Add page number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

      pdf.addPage();
      y = 15;

      // Redraw header on new page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setFillColor(240, 240, 240);

      x = colX[0];
      for (let j = 0; j < colWidths.length; j++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
        x += colWidths[j];
      }

      x = colX[0];
      for (let j = 0; j < headers.length; j++) {
        const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[j];
      }

      y += rowHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
    }

    // Draw row border
    x = colX[0];
    for (let j = 0; j < colWidths.length; j++) {
      pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
      x += colWidths[j];
    }

    // Row data sesuai urutan yang diminta
    const rowData = [
      (i + 1).toString(), // Nomor urut
      ket.TanggalKetetapan ? formatTanggalCetak(new Date(ket.TanggalKetetapan)) : '-',
      ket.ID_Ketetapan || '-',
      namaUsaha,
      ket.NPWPD || '-',
      jenisPajak,
      ket.MasaPajak || '-',
      formatRupiahPdf(ket.TotalTagihan || 0),
      ket.Status || '-'
    ];

    // Draw cell data
    x = colX[0];
    for (let j = 0; j < rowData.length; j++) {
      const cellData = String(rowData[j]);
      const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
      pdf.text(lines, x + 1, y - 1);
      x += colWidths[j];
    }

    y += rowHeight;
  }

  // Footer dengan tanda tangan
  if (y > maxY - 40) {
    pdf.addPage();
    y = 15;
  }

  y = Math.max(y + 10, maxY - 40);

  // Tanda tangan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const signX = pageWidth - 80;

  pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
  y += 8;
  pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
  y += 20;
  pdf.text('Nama Lengkap', signX, y);
  y += 6;
  pdf.text('NIP. ......................', signX, y);

  // Page number
  pdf.setFontSize(8);
  pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

  // Save PDF
  const fileName = `Laporan_Ketetapan_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
  console.log('=== KETETAPAN PDF EXPORT SUCCESS ===');
  console.log('File name:', fileName);
  console.log('Total records:', ketetapanData.length);
  console.log('Date range:', startDate ? formatTanggalCetak(startDate) : 'All', 'to', endDate ? formatTanggalCetak(endDate) : 'All');
  console.log('Sorting: Ascending by Tanggal Ketetapan (oldest first)');
  console.log('Column widths optimized for F4 paper (265mm total width)');
  console.log('Added NPWPD and Nama Usaha columns for better data identification');
  pdf.save(fileName);
}

// Fungsi export PDF untuk Laporan Wajib Pajak
async function exportWajibPajakToPDF({
  reportData,
  startDate,
  endDate,
  filterByDate = true
}) {
  // Filter data wajib pajak berdasarkan tanggal pendaftaran
  let wajibPajakData = reportData.wajibPajak || [];

  if (filterByDate && startDate && endDate) {
    wajibPajakData = wajibPajakData.filter(wp => {
      if (!wp.tanggal_pendaftaran) return false;
      const tglDaftar = new Date(wp.tanggal_pendaftaran);
      return tglDaftar >= startDate && tglDaftar <= endDate;
    });
  }

  // Urutkan berdasarkan tanggal pendaftaran (terbaru dulu)
  wajibPajakData.sort((a, b) => {
    const dateA = new Date(a.tanggal_pendaftaran || '1970-01-01');
    const dateB = new Date(b.tanggal_pendaftaran || '1970-01-01');
    return dateB - dateA;
  });

  // Siapkan jsPDF landscape untuk F4 (210 x 330 mm)
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 330] // F4 landscape
  });

  const pageWidth = 330;
  const pageHeight = 210;
  let y = 15;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y, 20, 20);
  } catch (e) {
    // Logo gagal dimuat, lanjutkan tanpa logo
  }

  // Header instansi
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
  y += 10;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Alamat kantor
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Garis pemisah
  pdf.setLineWidth(1);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Judul laporan
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('LAPORAN DATA WAJIB PAJAK TERDAFTAR', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Periode laporan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  let periodeText = 'Semua Periode';
  if (filterByDate && startDate && endDate) {
    const startStr = formatTanggalCetak(startDate);
    const endStr = formatTanggalCetak(endDate);
    periodeText = `${startStr} s/d ${endStr}`;
  }
  pdf.text(`Periode Pendaftaran: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Info jumlah data
  pdf.setFontSize(10);
  pdf.text(`Total Data: ${wajibPajakData.length} Wajib Pajak`, 15, y);
  y += 8;

  // Tabel header - 10 kolom (dengan nomor urut)
  const colWidths = [15, 25, 30, 35, 35, 25, 50, 25, 25, 25]; // Total: 290mm (dari 330mm dengan margin)
  const colX = [15]; // Start position
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i-1] + colWidths[i-1]);
  }

  const headers = [
    'No',
    'Tanggal Daftar',
    'NPWPD',
    'Nama Usaha',
    'Nama Pemilik',
    'NIK KTP',
    'Alamat',
    'Kelurahan',
    'Kecamatan',
    'Telephone'
  ];

  const rowHeight = 8;
  const maxY = pageHeight - 30; // Leave space for footer

  // Draw table header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setFillColor(240, 240, 240);

  // Header background
  let x = colX[0];
  for (let i = 0; i < colWidths.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
    x += colWidths[i];
  }

  // Header text
  x = colX[0];
  for (let i = 0; i < headers.length; i++) {
    const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
    pdf.text(lines, x + 1, y - 1);
    x += colWidths[i];
  }

  y += rowHeight;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  for (let i = 0; i < wajibPajakData.length; i++) {
    const wp = wajibPajakData[i];

    // Check if we need a new page
    if (y + rowHeight > maxY) {
      // Add page number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

      pdf.addPage();
      y = 15;

      // Redraw header on new page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setFillColor(240, 240, 240);

      x = colX[0];
      for (let j = 0; j < colWidths.length; j++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
        x += colWidths[j];
      }

      x = colX[0];
      for (let j = 0; j < headers.length; j++) {
        const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[j];
      }

      y += rowHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
    }

    // Draw row border
    x = colX[0];
    for (let j = 0; j < colWidths.length; j++) {
      pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
      x += colWidths[j];
    }

    // Row data sesuai urutan yang diminta (dengan nomor urut)
    const rowData = [
      (i + 1).toString(), // Nomor urut
      wp.tanggal_pendaftaran ? formatTanggalCetak(new Date(wp.tanggal_pendaftaran)) : '-',
      wp.NPWPD || '-',
      wp['Nama Usaha'] || '-',
      wp['Nama Pemilik'] || '-',
      wp['NIK KTP'] || '-',
      wp.Alamat || '-',
      wp.Kelurahan || '-',
      wp.Kecamatan || '-',
      wp.Telephone || '-'
    ];

    // Draw cell data
    x = colX[0];
    for (let j = 0; j < rowData.length; j++) {
      const cellData = String(rowData[j]);
      const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
      pdf.text(lines, x + 1, y - 1);
      x += colWidths[j];
    }

    y += rowHeight;
  }

  // Footer dengan tanda tangan
  if (y > maxY - 40) {
    pdf.addPage();
    y = 15;
  }

  y = Math.max(y + 10, maxY - 40);

  // Tanda tangan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const signX = pageWidth - 80;

  pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
  y += 8;
  pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
  y += 20;
  pdf.text('Nama Lengkap', signX, y);
  y += 6;
  pdf.text('NIP. ......................', signX, y);

  // Page number
  pdf.setFontSize(8);
  pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

  // Save PDF
  const fileName = `Laporan_Wajib_Pajak_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
}

// Fungsi export PDF untuk Laporan Pembayaran
async function exportPembayaranToPDF({
  reportData,
  startDate,
  endDate,
  filterByDate = true
}) {
  // Filter data pembayaran berdasarkan tanggal pembayaran
  let pembayaranData = reportData.pembayaran || [];

  if (filterByDate && startDate && endDate) {
    pembayaranData = pembayaranData.filter(p => {
      if (!p.TanggalBayar) return false;
      const tglBayar = new Date(p.TanggalBayar);
      return tglBayar >= startDate && tglBayar <= endDate;
    });
  }

  // Urutkan berdasarkan tanggal pembayaran (terlama dulu)
  pembayaranData.sort((a, b) => {
    const dateA = new Date(a.TanggalBayar || '1970-01-01');
    const dateB = new Date(b.TanggalBayar || '1970-01-01');
    return dateA - dateB; // Ascending order (oldest first)
  });

  console.log('=== PEMBAYARAN DATA SORTING ===');
  console.log('Total records before sorting:', pembayaranData.length);
  console.log('First record date:', pembayaranData[0]?.TanggalBayar);
  console.log('Last record date:', pembayaranData[pembayaranData.length - 1]?.TanggalBayar);
  console.log('Sorting: Ascending by Tanggal Bayar (oldest first)');
  console.log('Column widths optimized for F4 paper (255mm total width)');
  console.log('Added NPWPD and Nama Usaha columns for better data identification');
  console.log('ID Pembayaran column widened from 25mm to 35mm for better readability');
  console.log('Nama Usaha column widened from 30mm to 35mm for better text display');

  // Siapkan jsPDF landscape untuk F4 (210 x 330 mm)
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 330] // F4 landscape
  });

  const pageWidth = 330;
  const pageHeight = 210;
  let y = 15;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y, 20, 20);
  } catch (e) {
    // Logo gagal dimuat, lanjutkan tanpa logo
  }

  // Header instansi
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
  y += 10;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Alamat kantor
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Garis pemisah
  pdf.setLineWidth(1);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Judul laporan
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('LAPORAN DATA PEMBAYARAN', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Periode laporan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  let periodeText = 'Semua Periode';
  if (filterByDate && startDate && endDate) {
    const startStr = formatTanggalCetak(startDate);
    const endStr = formatTanggalCetak(endDate);
    periodeText = `${startStr} s/d ${endStr}`;
  }
  pdf.text(`Periode Pembayaran: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Info jumlah data
  pdf.setFontSize(10);
  pdf.text(`Total Data: ${pembayaranData.length} Pembayaran`, 15, y);
  y += 8;

  // Tabel header - 10 kolom dengan proporsi yang lebih proporsional
  // [No, NPWPD, Nama Usaha, ID Pembayaran, ID Ketetapan, Tanggal Bayar, Jumlah Bayar, Metode Bayar, Operator, Status]
  const colWidths = [10, 25, 35, 35, 30, 25, 30, 20, 25, 20]; // Total: 255mm (dari 330mm dengan margin)
  // ID Pembayaran diperlebar dari 25mm ke 35mm untuk readability yang lebih baik
  const colX = [15]; // Start position
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i-1] + colWidths[i-1]);
  }

  const headers = [
    'No',
    'NPWPD',
    'Nama Usaha',
    'ID Pembayaran',
    'ID Ketetapan',
    'Tanggal Bayar',
    'Jumlah Bayar',
    'Metode Bayar',
    'Operator',
    'Status'
  ];

  const rowHeight = 8;
  const maxY = pageHeight - 30; // Leave space for footer

  // Draw table header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setFillColor(240, 240, 240);

  // Header background
  let x = colX[0];
  for (let i = 0; i < colWidths.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
    x += colWidths[i];
  }

  // Header text
  x = colX[0];
  for (let i = 0; i < headers.length; i++) {
    const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
    pdf.text(lines, x + 1, y - 1);
    x += colWidths[i];
  }

  y += rowHeight;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  for (let i = 0; i < pembayaranData.length; i++) {
    const pembayaran = pembayaranData[i];

    // Check if we need a new page
    if (y + rowHeight > maxY) {
      // Add page number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

      pdf.addPage();
      y = 15;

      // Redraw header on new page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setFillColor(240, 240, 240);

      x = colX[0];
      for (let j = 0; j < colWidths.length; j++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
        x += colWidths[j];
      }

      x = colX[0];
      for (let j = 0; j < headers.length; j++) {
        const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[j];
      }

      y += rowHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
    }

    // Draw row border
    x = colX[0];
    for (let j = 0; j < colWidths.length; j++) {
      pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
      x += colWidths[j];
    }

    // Cari data wajib pajak untuk mendapatkan NPWPD dan nama usaha
    const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === pembayaran.NPWPD);
    const namaUsaha = wpData?.['Nama Usaha'] || '-';

    // Row data
    const rowData = [
      (i + 1).toString(), // Nomor urut
      pembayaran.NPWPD || '-',
      namaUsaha,
      pembayaran.ID_Pembayaran || '-',
      pembayaran.ID_Ketetapan || '-',
      pembayaran.TanggalBayar ? formatTanggalCetak(new Date(pembayaran.TanggalBayar)) : '-',
      formatRupiahPdf(pembayaran.JumlahBayar || 0),
      pembayaran.MetodeBayar || '-',
      pembayaran.Operator || '-',
      pembayaran.StatusPembayaran || '-'
    ];

    // Draw cell data
    x = colX[0];
    for (let j = 0; j < rowData.length; j++) {
      const cellData = String(rowData[j]);
      const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
      pdf.text(lines, x + 1, y - 1);
      x += colWidths[j];
    }

    y += rowHeight;
  }

  // Footer dengan tanda tangan
  if (y > maxY - 40) {
    pdf.addPage();
    y = 15;
  }

  y = Math.max(y + 10, maxY - 40);

  // Tanda tangan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const signX = pageWidth - 80;

  pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
  y += 8;
  pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
  y += 20;
  pdf.text('Nama Lengkap', signX, y);
  y += 6;
  pdf.text('NIP. ......................', signX, y);

  // Page number
  pdf.setFontSize(8);
  pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

  // Save PDF
  const fileName = `Laporan_Pembayaran_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
  console.log('=== PEMBAYARAN PDF EXPORT SUCCESS ===');
  console.log('File name:', fileName);
  console.log('Total records:', pembayaranData.length);
  console.log('Date range:', startDate ? formatTanggalCetak(startDate) : 'All', 'to', endDate ? formatTanggalCetak(endDate) : 'All');
  console.log('Sorting: Ascending by Tanggal Bayar (oldest first)');
  console.log('Column widths optimized for F4 paper (255mm total width)');
  console.log('Added NPWPD and Nama Usaha columns for better data identification');
  console.log('ID Pembayaran column widened from 25mm to 35mm for better readability');
  console.log('Nama Usaha column widened from 30mm to 35mm for better text display');
  pdf.save(fileName);
}

// Fungsi export PDF untuk Laporan Fiskal
async function exportFiskalToPDF({
  reportData,
  startDate,
  endDate,
  filterByDate = true
}) {
  // Filter data fiskal berdasarkan tanggal cetak
  let fiskalData = reportData.fiskal || [];

  if (filterByDate && startDate && endDate) {
    fiskalData = fiskalData.filter(f => {
      if (!f.tanggal_cetak) return false;
      const tglCetak = new Date(f.tanggal_cetak);
      return tglCetak >= startDate && tglCetak <= endDate;
    });
  }

  // Urutkan berdasarkan tanggal cetak (terlama dulu)
  fiskalData.sort((a, b) => {
    const dateA = new Date(a.tanggal_cetak || '1970-01-01');
    const dateB = new Date(b.tanggal_cetak || '1970-01-01');
    return dateA - dateB; // Ascending order (oldest first)
  });

  console.log('=== FISKAL DATA SORTING ===');
  console.log('Total records before sorting:', fiskalData.length);
  console.log('First record date:', fiskalData[0]?.tanggal_cetak);
  console.log('Last record date:', fiskalData[fiskalData.length - 1]?.tanggal_cetak);
  console.log('Sorting: Ascending by Tanggal Cetak (oldest first)');

  // Siapkan jsPDF landscape untuk F4 (210 x 330 mm)
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 330] // F4 landscape
  });

  const pageWidth = 330;
  const pageHeight = 210;
  let y = 15;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y, 20, 20);
  } catch (e) {
    // Logo gagal dimuat, lanjutkan tanpa logo
  }

  // Header instansi
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
  y += 10;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Alamat kantor
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Garis pemisah
  pdf.setLineWidth(1);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Judul laporan
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('LAPORAN DATA FISKAL', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Periode laporan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  let periodeText = 'Semua Periode';
  if (filterByDate && startDate && endDate) {
    const startStr = formatTanggalCetak(startDate);
    const endStr = formatTanggalCetak(endDate);
    periodeText = `${startStr} s/d ${endStr}`;
  }
  pdf.text(`Periode Cetak Fiskal: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Info jumlah data
  pdf.setFontSize(10);
  pdf.text(`Total Data: ${fiskalData.length} Fiskal`, 15, y);
  y += 8;

  // Tabel header - 7 kolom dengan proporsi yang lebih proporsional
  // [No, Nomor Fiskal, NPWPD, Nama Usaha, Tanggal Cetak, Tanggal Berlaku, Status]
  const colWidths = [12, 55, 30, 40, 30, 30, 25]; // Total: 222mm (dari 330mm dengan margin) - Nomor Fiskal diperlebar dari 45mm ke 55mm
  const colX = [15]; // Start position
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i-1] + colWidths[i-1]);
  }

  const headers = [
    'No',
    'Nomor Fiskal',
    'NPWPD',
    'Nama Usaha',
    'Tanggal Cetak',
    'Tanggal Berlaku',
    'Status'
  ];

  const rowHeight = 8;
  const maxY = pageHeight - 30; // Leave space for footer

  // Draw table header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setFillColor(240, 240, 240);

  // Header background
  let x = colX[0];
  for (let i = 0; i < colWidths.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
    x += colWidths[i];
  }

  // Header text
  x = colX[0];
  for (let i = 0; i < headers.length; i++) {
    const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
    pdf.text(lines, x + 1, y - 1);
    x += colWidths[i];
  }

  y += rowHeight;

  // Table data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  for (let i = 0; i < fiskalData.length; i++) {
    const fiskal = fiskalData[i];

    // Cari data wajib pajak untuk nama usaha
    const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === fiskal.NPWPD);
    const namaUsaha = wpData?.['Nama Usaha'] || '-';

    // Check if we need a new page
    if (y + rowHeight > maxY) {
      // Add page number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

      pdf.addPage();
      y = 15;

      // Redraw header on new page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setFillColor(240, 240, 240);

      x = colX[0];
      for (let j = 0; j < colWidths.length; j++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
        x += colWidths[j];
      }

      x = colX[0];
      for (let j = 0; j < headers.length; j++) {
        const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[j];
      }

      y += rowHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
    }

    // Draw row border
    x = colX[0];
    for (let j = 0; j < colWidths.length; j++) {
      pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
      x += colWidths[j];
    }

    // Row data
    const rowData = [
      (i + 1).toString(), // Nomor urut
      fiskal.nomor_fiskal || '-',
      fiskal.NPWPD || '-',
      namaUsaha,
      fiskal.tanggal_cetak ? formatTanggalCetak(new Date(fiskal.tanggal_cetak)) : '-',
      fiskal.tanggal_berlaku ? formatTanggalCetak(new Date(fiskal.tanggal_berlaku)) : '-',
      fiskal.status || 'Aktif'
    ];

    // Draw cell data
    x = colX[0];
    for (let j = 0; j < rowData.length; j++) {
      const cellData = String(rowData[j]);
      const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
      pdf.text(lines, x + 1, y - 1);
      x += colWidths[j];
    }

    y += rowHeight;
  }

  // Footer dengan tanda tangan
  if (y > maxY - 40) {
    pdf.addPage();
    y = 15;
  }

  y = Math.max(y + 10, maxY - 40);

  // Tanda tangan
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const signX = pageWidth - 80;

  pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
  y += 8;
  pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
  y += 20;
  pdf.text('Nama Lengkap', signX, y);
  y += 6;
  pdf.text('NIP. ......................', signX, y);

  // Page number
  pdf.setFontSize(8);
  pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

  // Save PDF
  const fileName = `Laporan_Fiskal_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
  console.log('=== FISKAL PDF EXPORT SUCCESS ===');
  console.log('File name:', fileName);
  console.log('Total records:', fiskalData.length);
  console.log('Date range:', startDate ? formatTanggalCetak(startDate) : 'All', 'to', endDate ? formatTanggalCetak(endDate) : 'All');
  console.log('Sorting: Ascending by Tanggal Cetak (oldest first)');
  console.log('Column widths optimized for F4 paper (202mm total width)');
  pdf.save(fileName);
}

// Function to group data by KodeLayanan for PDF
function groupDataByKodeLayananForPDF(data, masterData, valueField = 'JumlahBayar', ketetapanData = null) {
    const grouped = {};

    console.log('=== GROUPING DATA DEBUG ===');
    console.log('Data length:', data.length);
    console.log('Master data length:', masterData?.length);
    console.log('Ketetapan data length:', ketetapanData?.length);
    console.log('Sample master data:', masterData?.[0]);

    // Check if pembayaran data has KodeLayanan field
    const samplePembayaran = data[0];
    if (samplePembayaran) {
        console.log('Sample pembayaran item:', samplePembayaran);
        console.log('Pembayaran has KodeLayanan field:', 'KodeLayanan' in samplePembayaran);
        console.log('Pembayaran has ID_Ketetapan field:', 'ID_Ketetapan' in samplePembayaran);
    }

    data.forEach(item => {
        console.log('Processing item:', item);
        console.log('Available fields in item:', Object.keys(item));

        // For pembayaran data, get KodeLayanan from ketetapan
        let kode = item.KodeLayanan;

        if (!kode && item.ID_Ketetapan && ketetapanData) {
            const ketetapan = ketetapanData.find(k => k.ID_Ketetapan === item.ID_Ketetapan);
            if (ketetapan) {
                kode = ketetapan.KodeLayanan;
                console.log('Found KodeLayanan from ketetapan:', kode, 'for ID_Ketetapan:', item.ID_Ketetapan);
            }
        }

        console.log('Final kode for this item:', kode);

        // Try different field name variations for master data lookup
        let master = null;
        if (masterData) {
            master = masterData.find(m =>
                m.KodeLayanan === kode ||
                m.kode_layanan === kode ||
                m.kode === kode ||
                String(m.KodeLayanan) === String(kode)
            );
        }

        console.log('Found master for kode', kode, ':', master);

        // Try different field name variations for name
        let namaObjek = kode; // fallback to kode
        if (master) {
            namaObjek = master.NamaLayanan ||
                       master.nama_layanan ||
                       master.nama ||
                       master.NamaLayanan ||
                       `Objek Pajak ${kode}`;
        }

        // Ensure we never have undefined
        if (!namaObjek || namaObjek === 'undefined') {
            namaObjek = `Objek Pajak ${kode}`;
        }

        console.log('Using nama for kode', kode, ':', namaObjek);

        if (!grouped[kode]) {
            grouped[kode] = {
                kode: kode,
                nama: namaObjek,
                items: [],
                total: 0,
                count: 0,
                lunas: 0,
                belumLunas: 0,
                tunggakan: 0
            };
        }

        grouped[kode].items.push(item);
        grouped[kode].count += 1;

        // Hitung berdasarkan jenis data
        const value = parseFloat(item[valueField] || item.TotalTagihan || item.JumlahBayar || 0);
        grouped[kode].total += value;

        // Untuk ketetapan, hitung status lunas/belum lunas
        if (item.Status) {
            if (item.Status === 'Lunas') {
                grouped[kode].lunas += 1;
            } else {
                grouped[kode].belumLunas += 1;
                grouped[kode].tunggakan += value;
            }
        }

        // Untuk pembayaran, hitung yang sukses
        if (item.StatusPembayaran === 'Sukses') {
            grouped[kode].lunas += 1;
        }
    });

    console.log('=== GROUPING RESULT ===');
    console.log('Grouped keys:', Object.keys(grouped));
    console.log('Sample grouped item:', Object.values(grouped)[0]);

    return grouped;
}

// Enhanced exportKetetapanToPDF with multiple format support
async function exportKetetapanToPDF({
    reportData,
    startDate,
    endDate,
    filterByDate,
    reportFormat = 'detailed'
} = {}) {
    try {
        console.log('=== EXPORT KETETAPAN PDF ===');
        console.log('Report Format:', reportFormat);

        // Filter data berdasarkan tanggal jika diperlukan
        let ketetapanData = reportData.ketetapan || [];
        if (filterByDate && startDate && endDate) {
            ketetapanData = ketetapanData.filter(k => {
                const tgl = new Date(k.TanggalKetetapan);
                return tgl >= startDate && tgl <= endDate;
            });
        }

        // Setup PDF
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = 297;
        let y = 18;

        // Header
        try {
            const img = new Image();
            img.src = 'images/logo.png';
            await img.decode();
            pdf.addImage(img, 'PNG', 15, y - 5, 22, 22);
        } catch (e) { /* logo gagal dimuat, lanjut tanpa logo */ }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
        y += 7;
        pdf.setFontSize(14);
        pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y, { align: 'center' });
        y += 5;
        pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
        y += 3;
        pdf.setLineWidth(1.2);
        pdf.line(15, y, pageWidth - 15, y);
        y += 7;

        // Title based on format
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        let titleText = 'LAPORAN KETETAPAN PAJAK';
        if (reportFormat === 'per-objek') {
            titleText = 'LAPORAN KETETAPAN PAJAK PER OBJEK';
        } else if (reportFormat === 'both') {
            titleText = 'LAPORAN KETETAPAN PAJAK DETAIL & PER OBJEK';
        }
        pdf.text(titleText, pageWidth / 2, y, { align: 'center' });
        y += 7;

        // Summary
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Total Ketetapan: ${ketetapanData.length}`, 15, y);
        const totalNilai = ketetapanData.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);
        pdf.text(`Total Nilai: Rp ${totalNilai.toLocaleString('id-ID')}`, 15, y + 5);
        y += 15;

        // Generate content based on format
        if (reportFormat === 'detailed' || reportFormat === 'both') {
            // Detailed Report - Original format
            await generateDetailedKetetapanReport(pdf, ketetapanData, reportData, pageWidth, y);
            y = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 20 : y + 20;

            if (reportFormat === 'both') {
                // Add page break for per-objek section
                pdf.addPage();
                y = 18;
                // Re-add header for per-objek section
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text('LAPORAN KETETAPAN PAJAK PER OBJEK', pageWidth / 2, y, { align: 'center' });
                y += 7;
            }
        }

        if (reportFormat === 'per-objek' || reportFormat === 'both') {
            // Per-Objek Report
            await generatePerObjekKetetapanReport(pdf, ketetapanData, reportData, pageWidth, y);
        }

        // Footer
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, 200);
        }

        const fileName = `Laporan_Ketetapan_${reportFormat}_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
        console.log('=== KETETAPAN PDF EXPORT SUCCESS ===');
        console.log('File name:', fileName);
        console.log('Format:', reportFormat);
        console.log('Total records:', ketetapanData.length);

        pdf.save(fileName);

    } catch (error) {
        console.error('Export Ketetapan PDF error:', error);
        alert('Error saat export PDF: ' + error.message);
    }
}

// Helper function for detailed ketetapan report
async function generateDetailedKetetapanReport(pdf, ketetapanData, reportData, pageWidth, startY) {
    let y = startY;

    // Table setup for detailed report
    const colWidths = [15, 25, 30, 45, 25, 35, 30, 35, 25];
    const headers = ['No', 'Tanggal Ketetapan', 'ID Ketetapan', 'Nama Usaha', 'NPWPD', 'Jenis Pajak', 'Masa Pajak', 'Total Tagihan', 'Status'];

    // Generate table data
    const tableData = ketetapanData.map((ket, idx) => {
        const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === ket.NPWPD);
        const namaUsaha = wpData?.['Nama Usaha'] || '-';
        const masterPajak = reportData.masterPajak?.find(mp => mp.KodeLayanan === ket.KodeLayanan);
        const jenisPajak = masterPajak?.NamaLayanan || ket.KodeLayanan || '-';

        return [
            (idx + 1).toString(),
            ket.TanggalKetetapan ? formatTanggalCetak(new Date(ket.TanggalKetetapan)) : '-',
            ket.ID_Ketetapan || '-',
            namaUsaha,
            ket.NPWPD || '-',
            jenisPajak,
            ket.MasaPajak || '-',
            formatRupiahPdf(ket.TotalTagihan || 0),
            ket.Status || '-'
        ];
    });

    // Draw table
    pdf.autoTable({
        head: [headers],
        body: tableData,
        startY: y,
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: colWidths[0] },
            1: { cellWidth: colWidths[1] },
            2: { cellWidth: colWidths[2] },
            3: { cellWidth: colWidths[3] },
            4: { cellWidth: colWidths[4] },
            5: { cellWidth: colWidths[5] },
            6: { cellWidth: colWidths[6] },
            7: { cellWidth: colWidths[7] },
            8: { cellWidth: colWidths[8] }
        },
        margin: { left: 15, right: 15 }
    });
}

// Helper function for per-objek ketetapan report
async function generatePerObjekKetetapanReport(pdf, ketetapanData, reportData, pageWidth, startY) {
    let y = startY;

    // Group data by KodeLayanan
    const groupedByObjek = groupDataByKodeLayananForPDF(ketetapanData, reportData.masterPajak, 'TotalTagihan');
    const totalNilai = Object.values(groupedByObjek).reduce((sum, obj) => sum + obj.total, 0);

    // Per-Objek Table - Fixed border alignment with wider Nama Objek column
    const colWidths = [25, 55, 30, 25, 20, 20, 25, 20]; // Total: 220mm
    const colX = [15]; // Start position
    for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
    }
    const rowHeight = 8;

    // Draw complete table grid first
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const tableTop = y - rowHeight + 2;
    const tableHeight = (Object.keys(groupedByObjek).length + 1) * rowHeight; // +1 for header

    // Draw outer border
    pdf.rect(15, tableTop, totalWidth, tableHeight, 'S');

    // Draw vertical lines
    for (let i = 1; i < colX.length; i++) {
        pdf.line(colX[i], tableTop, colX[i], tableTop + tableHeight);
    }

    // Draw horizontal lines
    for (let i = 0; i <= Object.keys(groupedByObjek).length + 1; i++) {
        const lineY = tableTop + (i * rowHeight);
        pdf.line(15, lineY, 15 + totalWidth, lineY);
    }

    // Table Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);

    pdf.text('Kode', colX[0] + colWidths[0] / 2, y, { align: 'center' });
    pdf.text('Nama Objek', colX[1] + colWidths[1] / 2, y, { align: 'center' });
    pdf.text('Jumlah', colX[2] + colWidths[2] / 2, y, { align: 'center' });
    pdf.text('Total Nilai', colX[3] + colWidths[3] / 2, y, { align: 'center' });
    pdf.text('Lunas', colX[4] + colWidths[4] / 2, y, { align: 'center' });
    pdf.text('Belum', colX[5] + colWidths[5] / 2, y, { align: 'center' });
    pdf.text('Tunggakan', colX[6] + colWidths[6] / 2, y, { align: 'center' });
    pdf.text('%', colX[7] + colWidths[7] / 2, y, { align: 'center' });

    y += rowHeight;

    // Table Data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    Object.values(groupedByObjek).forEach(objek => {
        if (y > 180) {
            pdf.addPage();
            y = 20;
        }

        pdf.text(objek.kode, colX[0] + 2, y);
        pdf.text(objek.nama.substring(0, 25), colX[1] + 2, y);
        pdf.text(objek.count.toString(), colX[2] + colWidths[2] / 2, y, { align: 'center' });
        pdf.text(formatRupiahPdf(objek.total), colX[3] + 2, y);
        pdf.text(objek.lunas.toString(), colX[4] + colWidths[4] / 2, y, { align: 'center' });
        pdf.text(objek.belumLunas.toString(), colX[5] + colWidths[5] / 2, y, { align: 'center' });
        pdf.text(formatRupiahPdf(objek.tunggakan), colX[6] + 2, y);
        pdf.text(`${((objek.total / totalNilai) * 100).toFixed(1)}%`, colX[7] + colWidths[7] / 2, y, { align: 'center' });

        y += rowHeight;
    });
}

// Helper function for detailed pembayaran report
async function generateDetailedPembayaranReport(pdf, pembayaranData, reportData, pageWidth, startY) {
    let y = startY;

    // Table setup for detailed report
    const colWidths = [10, 25, 35, 35, 30, 25, 30, 20, 25, 20];
    const headers = ['No', 'NPWPD', 'Nama Usaha', 'ID Pembayaran', 'ID Ketetapan', 'Tanggal Bayar', 'Jumlah Bayar', 'Metode Bayar', 'Operator', 'Status'];

    // Generate table data
    const tableData = pembayaranData.map((pembayaran, idx) => {
        const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === pembayaran.NPWPD);
        const namaUsaha = wpData?.['Nama Usaha'] || '-';

        return [
            (idx + 1).toString(),
            pembayaran.NPWPD || '-',
            namaUsaha,
            pembayaran.ID_Pembayaran || '-',
            pembayaran.ID_Ketetapan || '-',
            pembayaran.TanggalBayar ? formatTanggalCetak(new Date(pembayaran.TanggalBayar)) : '-',
            formatRupiahPdf(pembayaran.JumlahBayar || 0),
            pembayaran.MetodeBayar || '-',
            pembayaran.Operator || '-',
            pembayaran.StatusPembayaran || '-'
        ];
    });

    // Draw table
    pdf.autoTable({
        head: [headers],
        body: tableData,
        startY: y,
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: colWidths[0] },
            1: { cellWidth: colWidths[1] },
            2: { cellWidth: colWidths[2] },
            3: { cellWidth: colWidths[3] },
            4: { cellWidth: colWidths[4] },
            5: { cellWidth: colWidths[5] },
            6: { cellWidth: colWidths[6] },
            7: { cellWidth: colWidths[7] },
            8: { cellWidth: colWidths[8] },
            9: { cellWidth: colWidths[9] }
        },
        margin: { left: 15, right: 15 }
    });
}

// Helper function for per-objek pembayaran report
async function generatePerObjekPembayaranReport(pdf, pembayaranData, reportData, pageWidth, startY) {
    let y = startY;

    // Debug: Log master pajak data structure
    console.log('=== DEBUG MASTER PAJAK DATA ===');
    console.log('Master pajak data:', reportData.masterPajak);
    if (reportData.masterPajak && reportData.masterPajak.length > 0) {
        console.log('First master pajak item:', reportData.masterPajak[0]);
        console.log('Available fields:', Object.keys(reportData.masterPajak[0]));
    }

    // Group data by KodeLayanan (get from ketetapan if not available in pembayaran)
    const groupedByObjek = groupDataByKodeLayananForPDF(pembayaranData, reportData.masterPajak, 'JumlahBayar', reportData.ketetapan);
    const totalNilai = Object.values(groupedByObjek).reduce((sum, obj) => sum + obj.total, 0);

    console.log('=== FINAL GROUPED RESULT ===');
    console.log('Grouped objek count:', Object.keys(groupedByObjek).length);
    console.log('Sample grouped data:', Object.values(groupedByObjek).slice(0, 2));

    // Per-Objek Table - Fixed border alignment
    const colWidths = [30, 45, 35, 25, 25, 25, 25]; // Total: 210mm
    const colX = [15]; // Start position
    for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
    }
    const rowHeight = 8;

    // Draw complete table grid first
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const tableTop = y - rowHeight + 2;
    const tableHeight = (Object.keys(groupedByObjek).length + 1) * rowHeight; // +1 for header

    // Draw outer border
    pdf.rect(15, tableTop, totalWidth, tableHeight, 'S');

    // Draw vertical lines
    for (let i = 1; i < colX.length; i++) {
        pdf.line(colX[i], tableTop, colX[i], tableTop + tableHeight);
    }

    // Draw horizontal lines
    for (let i = 0; i <= Object.keys(groupedByObjek).length + 1; i++) {
        const lineY = tableTop + (i * rowHeight);
        pdf.line(15, lineY, 15 + totalWidth, lineY);
    }

    // Table Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);

    pdf.text('Kode', colX[0] + colWidths[0] / 2, y, { align: 'center' });
    pdf.text('Nama Objek', colX[1] + colWidths[1] / 2, y, { align: 'center' });
    pdf.text('Jumlah', colX[2] + colWidths[2] / 2, y, { align: 'center' });
    pdf.text('Total Nilai', colX[3] + colWidths[3] / 2, y, { align: 'center' });
    pdf.text('Sukses', colX[4] + colWidths[4] / 2, y, { align: 'center' });
    pdf.text('Gagal', colX[5] + colWidths[5] / 2, y, { align: 'center' });
    pdf.text('%', colX[6] + colWidths[6] / 2, y, { align: 'center' });

    y += rowHeight;

    // Table Data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    Object.values(groupedByObjek).forEach(objek => {
        if (y > 180) {
            pdf.addPage();
            y = 20;
        }

        pdf.text(String(objek.kode || '-'), colX[0] + 2, y);
        const namaDisplay = (objek.nama && objek.nama !== objek.kode) ? objek.nama : 'Objek Pajak';
        pdf.text(String(namaDisplay.substring(0, 20)), colX[1] + 2, y);
        pdf.text(String(objek.count || 0), colX[2] + colWidths[2] / 2, y, { align: 'center' });
        pdf.text(String(formatRupiahPdf(objek.total || 0)), colX[3] + 2, y);
        pdf.text(String(objek.lunas || 0), colX[4] + colWidths[4] / 2, y, { align: 'center' });
        pdf.text(String((objek.count || 0) - (objek.lunas || 0)), colX[5] + colWidths[5] / 2, y, { align: 'center' });
        pdf.text(String(`${totalNilai > 0 ? (((objek.total || 0) / totalNilai) * 100).toFixed(1) : 0}%`), colX[6] + colWidths[6] / 2, y, { align: 'center' });

        y += rowHeight;
    });
}

// Enhanced exportPembayaranToPDF with multiple format support
async function exportPembayaranToPDF({
    reportData,
    startDate,
    endDate,
    filterByDate,
    reportFormat = 'detailed'
} = {}) {
    try {
        console.log('=== EXPORT PEMBAYARAN PDF ===');
        console.log('Report Format:', reportFormat);

        // Filter data berdasarkan tanggal jika diperlukan
        let pembayaranData = reportData.pembayaran || [];
        if (filterByDate && startDate && endDate) {
            pembayaranData = pembayaranData.filter(p => {
                const tgl = new Date(p.TanggalBayar);
                return tgl >= startDate && tgl <= endDate;
            });
        }

        // Setup PDF
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = 297;
        let y = 18;

        // Header
        try {
            const img = new Image();
            img.src = 'images/logo.png';
            await img.decode();
            pdf.addImage(img, 'PNG', 15, y - 5, 22, 22);
        } catch (e) { /* logo gagal dimuat, lanjut tanpa logo */ }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
        y += 7;
        pdf.setFontSize(14);
        pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y, { align: 'center' });
        y += 5;
        pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
        y += 3;
        pdf.setLineWidth(1.2);
        pdf.line(15, y, pageWidth - 15, y);
        y += 7;

        // Title based on format
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        let titleText = 'LAPORAN PEMBAYARAN PAJAK';
        if (reportFormat === 'per-objek') {
            titleText = 'LAPORAN PEMBAYARAN PAJAK PER OBJEK';
        } else if (reportFormat === 'both') {
            titleText = 'LAPORAN PEMBAYARAN PAJAK DETAIL & PER OBJEK';
        }
        pdf.text(titleText, pageWidth / 2, y, { align: 'center' });
        y += 7;

        // Summary
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Total Pembayaran: ${pembayaranData.length}`, 15, y);
        const totalNilai = pembayaranData.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
        pdf.text(`Total Nilai: Rp ${totalNilai.toLocaleString('id-ID')}`, 15, y + 5);
        y += 15;

        // Generate content based on format
        if (reportFormat === 'detailed' || reportFormat === 'both') {
            // Detailed Report - Original format
            await generateDetailedPembayaranReport(pdf, pembayaranData, reportData, pageWidth, y);
            y = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 20 : y + 20;

            if (reportFormat === 'both') {
                // Add page break for per-objek section
                pdf.addPage();
                y = 18;
                // Re-add header for per-objek section
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text('LAPORAN PEMBAYARAN PAJAK PER OBJEK', pageWidth / 2, y, { align: 'center' });
                y += 7;
            }
        }

        if (reportFormat === 'per-objek' || reportFormat === 'both') {
            // Per-Objek Report
            await generatePerObjekPembayaranReport(pdf, pembayaranData, reportData, pageWidth, y);
        }

        // Footer
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, 200);
        }

        const fileName = `Laporan_Pembayaran_${reportFormat}_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
        console.log('=== PEMBAYARAN PDF EXPORT SUCCESS ===');
        console.log('File name:', fileName);
        console.log('Format:', reportFormat);
        console.log('Total records:', pembayaranData.length);

        pdf.save(fileName);

    } catch (error) {
        console.error('Export Pembayaran PDF error:', error);
        alert('Error saat export PDF: ' + error.message);
    }
}

// Make functions globally available immediately
window.exportWajibPajakToPDF = exportWajibPajakToPDF;
window.exportKetetapanToPDF = exportKetetapanToPDF;
window.exportPembayaranToPDF = exportPembayaranToPDF;
window.exportFiskalToPDF = exportFiskalToPDF;
window.exportPendapatanToPDF = exportPendapatanToPDF;
window.exportOverdueWpToPDF = exportOverdueWpToPDF;
window.exportFiskalReportToPDF = exportFiskalReportToPDF;
window.exportPerObjekReportToPDF = exportPerObjekReportToPDF;

// Signal that PDF functions are ready
window.pdfFunctionsReady = true;

// Debug: Confirm all functions are available
console.log('=== CETAKREPORT.JS FUNCTIONS MADE GLOBAL ===');
console.log('exportWajibPajakToPDF:', typeof window.exportWajibPajakToPDF);
console.log('exportKetetapanToPDF:', typeof window.exportKetetapanToPDF);
console.log('exportPembayaranToPDF:', typeof window.exportPembayaranToPDF);
console.log('exportFiskalToPDF:', typeof window.exportFiskalToPDF);
console.log('exportPendapatanToPDF:', typeof window.exportPendapatanToPDF);
console.log('exportOverdueWpToPDF:', typeof window.exportOverdueWpToPDF);
console.log('exportFiskalReportToPDF:', typeof window.exportFiskalReportToPDF);
console.log('exportPerObjekReportToPDF:', typeof window.exportPerObjekReportToPDF);
console.log('formatRupiahPdf:', typeof formatRupiahPdf);

// Debug: Log when functions are loaded
console.log('=== CETAKREPORT.JS LOADED ===');
console.log('PDF Export functions loaded:', {
    exportWajibPajakToPDF: typeof window.exportWajibPajakToPDF,
    exportKetetapanToPDF: typeof window.exportKetetapanToPDF,
    exportPembayaranToPDF: typeof window.exportPembayaranToPDF,
    exportFiskalToPDF: typeof window.exportFiskalToPDF,
    exportPendapatanToPDF: typeof window.exportPendapatanToPDF
});

// Test function availability after a short delay
setTimeout(() => {
    console.log('=== FUNCTION AVAILABILITY CHECK ===');
    console.log('window.exportWajibPajakToPDF:', typeof window.exportWajibPajakToPDF);
    console.log('window.exportKetetapanToPDF:', typeof window.exportKetetapanToPDF);
    console.log('window.exportPembayaranToPDF:', typeof window.exportPembayaranToPDF);
    console.log('window.exportFiskalToPDF:', typeof window.exportFiskalToPDF);
    console.log('window.exportPendapatanToPDF:', typeof window.exportPendapatanToPDF);
    console.log('window.exportOverdueWpToPDF:', typeof window.exportOverdueWpToPDF);
    console.log('window.exportFiskalReportToPDF:', typeof window.exportFiskalReportToPDF);
    console.log('window.exportPerObjekReportToPDF:', typeof window.exportPerObjekReportToPDF);
    console.log('window.testPdfFunctions:', typeof window.testPdfFunctions);
    console.log('window.exportReport:', typeof window.exportReport);
}, 1000);

// Fungsi integrasi tombol export di report.html
function setupExportButtons() {
  const exportBtn = document.querySelector('button[onclick="exportReport()"]');
  if (!exportBtn) return;

  console.log('=== SETUP EXPORT BUTTONS INITIALIZED ===');

  exportBtn.addEventListener('click', () => {
   const reportType = document.getElementById('reportType').value;
   const reportFormat = document.getElementById('reportFormat').value;
   console.log('=== EXPORT BUTTON CLICKED ===');
   console.log('Report Type from cetakreport.js:', reportType);
   console.log('Report Format from cetakreport.js:', reportFormat);

    if (reportType === 'wp') {
      // Export Wajib Pajak
      const { startDate, endDate } = getDateRange();
      const filterByDate = document.getElementById('dateRange').value !== 'year';

      exportWajibPajakToPDF({
        reportData: reportData,
        startDate,
        endDate,
        filterByDate
      });
    } else if (reportType === 'ketetapan') {
      // Export Ketetapan
      const { startDate, endDate } = getDateRange();
      const filterByDate = document.getElementById('ketetapanEndDate')?.value !== '';

      if (typeof exportKetetapanToPDF === 'function') {
        console.log('=== CETAKREPORT.JS: CALLING KETETAPAN EXPORT ===');
        exportKetetapanToPDF({
          reportData,
          startDate,
          endDate,
          filterByDate,
          reportFormat
        });
      } else {
        alert('Fungsi export ketetapan belum tersedia!');
      }
    } else if (reportType === 'pembayaran') {
      // Export Pembayaran
      const { startDate, endDate } = getDateRange();
      const filterByDate = document.getElementById('pembayaranEndDate')?.value !== '';

      if (typeof exportPembayaranToPDF === 'function') {
        console.log('=== CETAKREPORT.JS: CALLING PEMBAYARAN EXPORT ===');
        exportPembayaranToPDF({
          reportData,
          startDate,
          endDate,
          filterByDate,
          reportFormat
        });
      } else {
        alert('Fungsi export pembayaran belum tersedia!');
      }
    } else if (reportType === 'revenue') {
      // Export Pendapatan (existing function)
      const tahun = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();
      const periodeLabel = getPeriodeLabel();
      const { startDate, endDate } = getDateRange();

      if (typeof exportPendapatanToPDF === 'function') {
        exportPendapatanToPDF({
          reportData,
          periodeLabel,
          tahun,
          startDate,
          endDate
        });
      } else {
        alert('Fungsi export pendapatan belum tersedia!');
      }
    } else {
      alert('Export PDF hanya tersedia untuk Laporan Wajib Pajak, Laporan Ketetapan, Laporan Pembayaran, dan Laporan Pendapatan!');
    }
  });
}

// Fungsi export PDF untuk Laporan Wajib Pajak Jatuh Tempo
async function exportOverdueWpToPDF({
    reportData,
    startDate,
    endDate
}) {
    // Filter ketetapan yang jatuh tempo
    const currentDate = new Date();
    const overdueKetetapan = (reportData.ketetapan || []).filter(k => {
        if (k.Status === 'Lunas') return false;
        if (!k.TanggalJatuhTempo) return false;
        const dueDate = new Date(k.TanggalJatuhTempo);
        return dueDate < currentDate;
    });

    // Group by NPWPD
    const overdueByWp = {};
    overdueKetetapan.forEach(k => {
        if (!overdueByWp[k.NPWPD]) {
            overdueByWp[k.NPWPD] = {
                npwpd: k.NPWPD,
                ketetapan: [],
                totalTagihan: 0
            };
        }
        overdueByWp[k.NPWPD].ketetapan.push(k);
        overdueByWp[k.NPWPD].totalTagihan += parseFloat(k.TotalTagihan) || 0;
    });

    // Siapkan jsPDF landscape untuk F4
    const pdf = new window.jspdf.jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 330]
    });

    const pageWidth = 330;
    const pageHeight = 210;
    let y = 15;

    // Kop dinas & logo
    try {
        const img = new Image();
        img.src = 'images/logo.png';
        await img.decode();
        pdf.addImage(img, 'PNG', 15, y, 20, 20);
    } catch (e) {
        // Logo gagal dimuat, lanjutkan tanpa logo
    }

    // Header instansi
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
    y += 10;
    pdf.setFontSize(14);
    pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Alamat kantor
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
    y += 3;

    // Garis pemisah
    pdf.setLineWidth(1);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Judul laporan
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('LAPORAN WAJIB PAJAK DENGAN KEWAJIBAN JATUH TEMPO', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Periode laporan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Tanggal Cetak: ${formatTanggalCetak(new Date())}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Info jumlah data
    pdf.setFontSize(10);
    pdf.text(`Total WP Jatuh Tempo: ${Object.keys(overdueByWp).length}`, 15, y);
    const totalOverdueValue = Object.values(overdueByWp).reduce((sum, wp) => sum + wp.totalTagihan, 0);
    pdf.text(`Total Nilai Jatuh Tempo: Rp ${totalOverdueValue.toLocaleString('id-ID')}`, 15, y + 5);
    y += 15;

    // Tabel header
    const colWidths = [15, 30, 50, 25, 40, 25];
    const colX = [15];
    for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
    }

    const headers = ['No', 'NPWPD', 'Nama Usaha', 'Jumlah Ketetapan', 'Total Tagihan', 'Status'];
    const rowHeight = 8;
    const maxY = pageHeight - 30;

    // Draw table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);

    let x = colX[0];
    for (let i = 0; i < colWidths.length; i++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
        x += colWidths[i];
    }

    x = colX[0];
    for (let i = 0; i < headers.length; i++) {
        const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[i];
    }

    y += rowHeight;

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    const overdueList = Object.values(overdueByWp);
    for (let i = 0; i < overdueList.length; i++) {
        const wp = overdueList[i];

        // Cari data wajib pajak
        const wpData = reportData.wajibPajak?.find(w => w.NPWPD === wp.npwpd);
        const namaUsaha = wpData?.['Nama Usaha'] || '-';

        // Check if we need a new page
        if (y + rowHeight > maxY) {
            pdf.addPage();
            y = 15;

            // Redraw header on new page
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setFillColor(240, 240, 240);

            x = colX[0];
            for (let j = 0; j < colWidths.length; j++) {
                pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
                x += colWidths[j];
            }

            x = colX[0];
            for (let j = 0; j < headers.length; j++) {
                const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
                pdf.text(lines, x + 1, y - 1);
                x += colWidths[j];
            }

            y += rowHeight;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
        }

        // Draw row border
        x = colX[0];
        for (let j = 0; j < colWidths.length; j++) {
            pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
            x += colWidths[j];
        }

        // Row data
        const rowData = [
            (i + 1).toString(),
            wp.npwpd,
            namaUsaha,
            wp.ketetapan.length.toString(),
            formatRupiahPdf(wp.totalTagihan),
            'Jatuh Tempo'
        ];

        x = colX[0];
        for (let j = 0; j < rowData.length; j++) {
            const cellData = String(rowData[j]);
            const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
            pdf.text(lines, x + 1, y - 1);
            x += colWidths[j];
        }

        y += rowHeight;
    }

    // Footer dengan tanda tangan
    if (y > maxY - 40) {
        pdf.addPage();
        y = 15;
    }

    y = Math.max(y + 10, maxY - 40);

    // Tanda tangan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const signX = pageWidth - 80;

    pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
    y += 8;
    pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
    y += 20;
    pdf.text('Nama Lengkap', signX, y);
    y += 6;
    pdf.text('NIP. ......................', signX, y);

    // Page number
    pdf.setFontSize(8);
    pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

    // Save PDF
    const fileName = `Laporan_WP_Jatuh_Tempo_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
}

// Fungsi export PDF untuk Laporan Daftar Fiskal
async function exportFiskalReportToPDF({
    reportData,
    startDate,
    endDate
}) {
    // Filter data fiskal berdasarkan tanggal cetak
    let fiskalData = reportData.fiskal || [];

    if (startDate && endDate) {
        fiskalData = fiskalData.filter(f => {
            if (!f.tanggal_cetak) return false;
            const tglCetak = new Date(f.tanggal_cetak);
            return tglCetak >= startDate && tglCetak <= endDate;
        });
    }

    // Urutkan berdasarkan tanggal cetak
    fiskalData.sort((a, b) => {
        const dateA = new Date(a.tanggal_cetak || '1970-01-01');
        const dateB = new Date(b.tanggal_cetak || '1970-01-01');
        return dateA - dateB;
    });

    // Siapkan jsPDF landscape untuk F4
    const pdf = new window.jspdf.jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 330]
    });

    const pageWidth = 330;
    const pageHeight = 210;
    let y = 15;

    // Kop dinas & logo
    try {
        const img = new Image();
        img.src = 'images/logo.png';
        await img.decode();
        pdf.addImage(img, 'PNG', 15, y, 20, 20);
    } catch (e) {
        // Logo gagal dimuat, lanjutkan tanpa logo
    }

    // Header instansi
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
    y += 10;
    pdf.setFontSize(14);
    pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Alamat kantor
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
    y += 3;

    // Garis pemisah
    pdf.setLineWidth(1);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Judul laporan
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('LAPORAN DAFTAR FISKAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Periode laporan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    let periodeText = 'Semua Periode';
    if (startDate && endDate) {
        const startStr = formatTanggalCetak(startDate);
        const endStr = formatTanggalCetak(endDate);
        periodeText = `${startStr} s/d ${endStr}`;
    }
    pdf.text(`Periode Cetak Fiskal: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Info jumlah data
    pdf.setFontSize(10);
    pdf.text(`Total Fiskal: ${fiskalData.length}`, 15, y);
    y += 8;

    // Tabel header
    const colWidths = [15, 40, 50, 35, 35, 25];
    const colX = [15];
    for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
    }

    const headers = ['No', 'Nomor Fiskal', 'NPWPD', 'Nama Usaha', 'Tanggal Cetak', 'Status'];
    const rowHeight = 8;
    const maxY = pageHeight - 30;

    // Draw table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);

    let x = colX[0];
    for (let i = 0; i < colWidths.length; i++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
        x += colWidths[i];
    }

    x = colX[0];
    for (let i = 0; i < headers.length; i++) {
        const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[i];
    }

    y += rowHeight;

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    for (let i = 0; i < fiskalData.length; i++) {
        const fiskal = fiskalData[i];

        // Cari data wajib pajak
        const wpData = reportData.wajibPajak?.find(w => w.NPWPD === fiskal.NPWPD);
        const namaUsaha = wpData?.['Nama Usaha'] || '-';

        // Check if we need a new page
        if (y + rowHeight > maxY) {
            pdf.addPage();
            y = 15;

            // Redraw header on new page
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setFillColor(240, 240, 240);

            x = colX[0];
            for (let j = 0; j < colWidths.length; j++) {
                pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
                x += colWidths[j];
            }

            x = colX[0];
            for (let j = 0; j < headers.length; j++) {
                const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
                pdf.text(lines, x + 1, y - 1);
                x += colWidths[j];
            }

            y += rowHeight;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
        }

        // Draw row border
        x = colX[0];
        for (let j = 0; j < colWidths.length; j++) {
            pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
            x += colWidths[j];
        }

        // Row data
        const rowData = [
            (i + 1).toString(),
            fiskal.nomor_fiskal || '-',
            fiskal.NPWPD || '-',
            namaUsaha,
            fiskal.tanggal_cetak ? formatTanggalCetak(new Date(fiskal.tanggal_cetak)) : '-',
            fiskal.status || 'Aktif'
        ];

        x = colX[0];
        for (let j = 0; j < rowData.length; j++) {
            const cellData = String(rowData[j]);
            const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
            pdf.text(lines, x + 1, y - 1);
            x += colWidths[j];
        }

        y += rowHeight;
    }

    // Footer dengan tanda tangan
    if (y > maxY - 40) {
        pdf.addPage();
        y = 15;
    }

    y = Math.max(y + 10, maxY - 40);

    // Tanda tangan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const signX = pageWidth - 80;

    pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
    y += 8;
    pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
    y += 20;
    pdf.text('Nama Lengkap', signX, y);
    y += 6;
    pdf.text('NIP. ......................', signX, y);

    // Page number
    pdf.setFontSize(8);
    pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

    // Save PDF
    const fileName = `Laporan_Daftar_Fiskal_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
}

// Fungsi export PDF untuk Laporan Per Objek Pajak
async function exportPerObjekReportToPDF({
    reportData,
    startDate,
    endDate,
    viewType = 'ketetapan'
}) {
    // Filter data berdasarkan tanggal jika diperlukan
    let ketetapanData = reportData.ketetapan || [];
    let pembayaranData = reportData.pembayaran || [];

    if (startDate && endDate) {
        ketetapanData = ketetapanData.filter(k => {
            if (!k.TanggalKetetapan) return false;
            const tgl = new Date(k.TanggalKetetapan);
            return tgl >= startDate && tgl <= endDate;
        });
        pembayaranData = pembayaranData.filter(p => {
            if (!p.TanggalBayar) return false;
            const tgl = new Date(p.TanggalBayar);
            return tgl >= startDate && tgl <= endDate;
        });
    }

    // Group ketetapan by KodeLayanan
    const ketetapanByObjek = {};
    ketetapanData.forEach(k => {
        const kode = k.KodeLayanan;
        if (!ketetapanByObjek[kode]) {
            ketetapanByObjek[kode] = {
                kode: kode,
                ketetapan: [],
                totalTagihan: 0,
                lunas: 0,
                belumLunas: 0,
                tunggakan: 0
            };
        }
        ketetapanByObjek[kode].ketetapan.push(k);
        ketetapanByObjek[kode].totalTagihan += parseFloat(k.TotalTagihan) || 0;
        if (k.Status === 'Lunas') {
            ketetapanByObjek[kode].lunas += 1;
        } else {
            ketetapanByObjek[kode].belumLunas += 1;
            ketetapanByObjek[kode].tunggakan += parseFloat(k.TotalTagihan) || 0;
        }
    });

    // Group pembayaran by KodeLayanan
    const pembayaranByObjek = {};
    pembayaranData.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = ketetapanData.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!pembayaranByObjek[kode]) {
            pembayaranByObjek[kode] = {
                kode: kode,
                pembayaran: [],
                totalPembayaran: 0,
                count: 0,
                metodeBayar: {}
            };
        }
        pembayaranByObjek[kode].pembayaran.push(p);
        pembayaranByObjek[kode].totalPembayaran += parseFloat(p.JumlahBayar) || 0;
        pembayaranByObjek[kode].count += 1;

        // Count payment methods
        const metode = p.MetodeBayar || 'Tidak Diketahui';
        pembayaranByObjek[kode].metodeBayar[metode] = (pembayaranByObjek[kode].metodeBayar[metode] || 0) + 1;
    });

    // Siapkan jsPDF landscape untuk F4
    const pdf = new window.jspdf.jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 330]
    });

    const pageWidth = 330;
    const pageHeight = 210;
    let y = 15;

    // Kop dinas & logo
    try {
        const img = new Image();
        img.src = 'images/logo.png';
        await img.decode();
        pdf.addImage(img, 'PNG', 15, y, 20, 20);
    } catch (e) {
        // Logo gagal dimuat, lanjutkan tanpa logo
    }

    // Header instansi
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 5, { align: 'center' });
    y += 10;
    pdf.setFontSize(14);
    pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Alamat kantor
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('JL. LINGKAR BURMESO DISTRIK MAMBERAMO TENGAH', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
    y += 3;

    // Garis pemisah
    pdf.setLineWidth(1);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Judul laporan
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    const titleText = viewType === 'ketetapan' ? 'LAPORAN PER OBJEK PAJAK - BERDASARKAN KETETAPAN' : 'LAPORAN PER OBJEK PAJAK - BERDASARKAN PEMBAYARAN';
    pdf.text(titleText, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Periode laporan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    let periodeText = 'Semua Periode';
    if (startDate && endDate) {
        const startStr = formatTanggalCetak(startDate);
        const endStr = formatTanggalCetak(endDate);
        periodeText = `${startStr} s/d ${endStr}`;
    }
    pdf.text(`Periode: ${periodeText}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Info jumlah data
    pdf.setFontSize(10);
    const totalObjek = Object.keys(ketetapanByObjek).length;
    const totalKetetapan = Object.values(ketetapanByObjek).reduce((sum, obj) => sum + obj.ketetapan.length, 0);
    const totalTagihan = Object.values(ketetapanByObjek).reduce((sum, obj) => sum + obj.totalTagihan, 0);
    const totalPembayaran = Object.values(pembayaranByObjek).reduce((sum, obj) => sum + obj.totalPembayaran, 0);

    pdf.text(`Total Objek Pajak: ${totalObjek}`, 15, y);
    pdf.text(`Total Ketetapan: ${totalKetetapan}`, 15, y + 5);
    pdf.text(`Total Tagihan: Rp ${totalTagihan.toLocaleString('id-ID')}`, 15, y + 10);
    pdf.text(`Total Pembayaran: Rp ${totalPembayaran.toLocaleString('id-ID')}`, 15, y + 15);
    y += 25;

    // Different table structure based on view type
    let colWidths, headers;

    if (viewType === 'ketetapan') {
        colWidths = [15, 25, 50, 25, 35, 35, 20, 20, 30, 20];
        headers = ['No', 'Kode', 'Nama Objek', 'Ketetapan', 'Total Tagihan', 'Total Bayar', 'Lunas', 'Belum', 'Tunggakan', '%'];
    } else {
        colWidths = [15, 25, 50, 25, 35, 25, 25, 25];
        headers = ['No', 'Kode', 'Nama Objek', 'Jumlah', 'Total Bayar', 'Metode Utama', 'Kontribusi', 'Rata-rata'];
    }

    const colX = [15];
    for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
    }

    const rowHeight = 8;
    const maxY = pageHeight - 30;

    // Draw table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);

    let x = colX[0];
    for (let i = 0; i < colWidths.length; i++) {
        pdf.rect(x, y - rowHeight + 2, colWidths[i], rowHeight, 'FD');
        x += colWidths[i];
    }

    x = colX[0];
    for (let i = 0; i < headers.length; i++) {
        const lines = pdf.splitTextToSize(headers[i], colWidths[i] - 2);
        pdf.text(lines, x + 1, y - 1);
        x += colWidths[i];
    }

    y += rowHeight;

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    let objekList, totalNilai;

    if (viewType === 'ketetapan') {
        objekList = Object.values(ketetapanByObjek);
        totalNilai = Object.values(ketetapanByObjek).reduce((sum, obj) => sum + obj.totalTagihan, 0);
    } else {
        objekList = Object.values(pembayaranByObjek);
        totalNilai = Object.values(pembayaranByObjek).reduce((sum, obj) => sum + obj.totalPembayaran, 0);
    }

    for (let i = 0; i < objekList.length; i++) {
        const obj = objekList[i];
        const master = reportData.masterPajak?.find(m => m.KodeLayanan === obj.kode);
        const namaObjek = master?.NamaLayanan || obj.kode;

        // Check if we need a new page
        if (y + rowHeight > maxY) {
            pdf.addPage();
            y = 15;

            // Redraw header on new page
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setFillColor(240, 240, 240);

            x = colX[0];
            for (let j = 0; j < colWidths.length; j++) {
                pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'FD');
                x += colWidths[j];
            }

            x = colX[0];
            for (let j = 0; j < headers.length; j++) {
                const lines = pdf.splitTextToSize(headers[j], colWidths[j] - 2);
                pdf.text(lines, x + 1, y - 1);
                x += colWidths[j];
            }

            y += rowHeight;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
        }

        // Draw row border
        x = colX[0];
        for (let j = 0; j < colWidths.length; j++) {
            pdf.rect(x, y - rowHeight + 2, colWidths[j], rowHeight, 'S');
            x += colWidths[j];
        }

        // Row data based on view type
        let rowData;
        if (viewType === 'ketetapan') {
            const pembayaran = pembayaranByObjek[obj.kode] || { totalPembayaran: 0, count: 0 };
            const persentase = obj.totalTagihan > 0 ? ((pembayaran.totalPembayaran / obj.totalTagihan) * 100).toFixed(1) : 0;
            rowData = [
                (i + 1).toString(),
                obj.kode,
                namaObjek,
                obj.ketetapan.length.toString(),
                formatRupiahPdf(obj.totalTagihan),
                formatRupiahPdf(pembayaran.totalPembayaran),
                obj.lunas.toString(),
                obj.belumLunas.toString(),
                formatRupiahPdf(obj.tunggakan),
                persentase + '%'
            ];
        } else {
            const kontribusi = totalNilai > 0 ? ((obj.totalPembayaran / totalNilai) * 100).toFixed(1) : 0;
            const metodeUtama = Object.entries(obj.metodeBayar || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
            rowData = [
                (i + 1).toString(),
                obj.kode,
                namaObjek,
                obj.count.toString(),
                formatRupiahPdf(obj.totalPembayaran),
                metodeUtama,
                kontribusi + '%',
                obj.count > 0 ? formatRupiahPdf(obj.totalPembayaran / obj.count) : 'Rp 0'
            ];
        }

        x = colX[0];
        for (let j = 0; j < rowData.length; j++) {
            const cellData = String(rowData[j]);
            const lines = pdf.splitTextToSize(cellData, colWidths[j] - 2);
            pdf.text(lines, x + 1, y - 1);
            x += colWidths[j];
        }

        y += rowHeight;
    }

    // Footer dengan tanda tangan
    if (y > maxY - 40) {
        pdf.addPage();
        y = 15;
    }

    y = Math.max(y + 10, maxY - 40);

    // Tanda tangan
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const signX = pageWidth - 80;

    pdf.text('Burmeso, ' + formatTanggalCetak(new Date()), signX, y);
    y += 8;
    pdf.text('Kepala Bidang Pendapatan Daerah', signX, y);
    y += 20;
    pdf.text('Nama Lengkap', signX, y);
    y += 6;
    pdf.text('NIP. ......................', signX, y);

    // Page number
    pdf.setFontSize(8);
    pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

    // Save PDF
    const fileName = `Laporan_Per_Objek_Pajak_${formatTanggalCetak(new Date()).replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
}

document.addEventListener('DOMContentLoaded', setupExportButtons);