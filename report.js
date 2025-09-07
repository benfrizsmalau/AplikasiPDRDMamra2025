// Report specific JavaScript
let reportData = {};

// Prevent multiple initializations
if (window.reportInitialized) {
    console.log('=== REPORT ALREADY INITIALIZED - SKIPPING ===');
} else {
    window.reportInitialized = true;
    console.log('=== REPORT INITIALIZING ===');
}

document.addEventListener('DOMContentLoaded', function() {
    initRevenueReportFilters();
    loadReportData();
    setupDateRangeFilter();
});

// Function untuk group data by KodeLayanan
function groupByKodeLayanan(data, masterData, valueField = 'JumlahBayar') {
    const grouped = {};

    data.forEach(item => {
        const kode = item.KodeLayanan;
        const master = masterData?.find(m => m.KodeLayanan === kode);

        if (!grouped[kode]) {
            grouped[kode] = {
                kode: kode,
                nama: master?.NamaLayanan || kode,
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

    return grouped;
}

// Function untuk menghitung persentase
function calculatePercentages(groupedData, totalValue) {
    Object.values(groupedData).forEach(objek => {
        objek.persentase = totalValue > 0 ? ((objek.total / totalValue) * 100).toFixed(1) : 0;
    });
    return groupedData;
}

// Function untuk display tabel per objek
function displayPerObjekTable(groupedData, containerId, reportType = 'ketetapan') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<table class="per-objek-table">';
    html += '<thead><tr>';
    html += '<th>Kode Objek</th>';
    html += '<th>Nama Objek</th>';
    html += '<th>Jumlah</th>';
    html += '<th>Total Nilai</th>';
    html += '<th>Persentase</th>';

    if (reportType === 'ketetapan') {
        html += '<th>Lunas</th>';
        html += '<th>Belum Lunas</th>';
        html += '<th>Tunggakan</th>';
    }

    html += '</tr></thead><tbody>';

    Object.values(groupedData).forEach(objek => {
        html += `<tr>
            <td>${objek.kode}</td>
            <td>${objek.nama}</td>
            <td>${objek.count}</td>
            <td>Rp ${objek.total.toLocaleString('id-ID')}</td>
            <td>${objek.persentase}%</td>`;

        if (reportType === 'ketetapan') {
            html += `<td>${objek.lunas}</td>
                     <td>${objek.belumLunas}</td>
                     <td>Rp ${objek.tunggakan.toLocaleString('id-ID')}</td>`;
        }

        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Report format handling
function changeReportFormat() {
    const format = document.getElementById('reportFormat').value;
    console.log('Report format changed to:', format);

    // Update UI based on format selection
    const perObjekSections = document.querySelectorAll('.per-objek-section');
    const detailTables = document.querySelectorAll('.data-table');

    if (format === 'per-objek') {
        perObjekSections.forEach(section => section.style.display = 'block');
        detailTables.forEach(table => table.style.display = 'none');
    } else if (format === 'detailed') {
        perObjekSections.forEach(section => section.style.display = 'none');
        detailTables.forEach(table => table.style.display = 'table');
    } else if (format === 'both') {
        perObjekSections.forEach(section => section.style.display = 'block');
        detailTables.forEach(table => table.style.display = 'table');
    }
}

// Make functions globally available
window.testPdfFunctions = testPdfFunctions;
window.exportReport = exportReport;
window.groupByKodeLayanan = groupByKodeLayanan;
window.displayPerObjekTable = displayPerObjekTable;
window.changeReportFormat = changeReportFormat;

// Function to check if PDF export functions are loaded
function checkPdfFunctionsLoaded() {
    return {
        wp: typeof window.exportWajibPajakToPDF === 'function',
        ketetapan: typeof window.exportKetetapanToPDF === 'function',
        pembayaran: typeof window.exportPembayaranToPDF === 'function',
        fiskal: typeof window.exportFiskalToPDF === 'function',
        pendapatan: typeof window.exportPendapatanToPDF === 'function'
    };
}

// Wait for PDF functions to be available
function waitForPdfFunctions(maxWait = 5000) {
    return new Promise((resolve) => {
        // First check if already loaded
        if (window.pdfFunctionsReady) {
            const functions = checkPdfFunctionsLoaded();
            const allLoaded = Object.values(functions).every(loaded => loaded);
            if (allLoaded) {
                console.log('✅ PDF functions already loaded');
                resolve(true);
                return;
            }
        }

        const checkInterval = setInterval(() => {
            const functions = checkPdfFunctionsLoaded();
            const allLoaded = Object.values(functions).every(loaded => loaded);

            if (allLoaded) {
                clearInterval(checkInterval);
                console.log('✅ All PDF export functions loaded successfully');
                resolve(true);
            }
        }, 100);

        // Timeout after maxWait milliseconds
        setTimeout(() => {
            clearInterval(checkInterval);
            const functions = checkPdfFunctionsLoaded();
            console.log('⏰ PDF functions check timeout. Available functions:', functions);
            // Still resolve with available functions status
            const anyLoaded = Object.values(functions).some(loaded => loaded);
            resolve(anyLoaded);
        }, maxWait);
    });
}

// Debug: Log when report.js is loaded
console.log('=== REPORT.JS LOADED ===');
console.log('Functions made global:', {
    testPdfFunctions: typeof window.testPdfFunctions,
    exportReport: typeof window.exportReport
});

function initRevenueReportFilters() {
    const tahunSelect = document.getElementById('dateRangeTahun');
    if (!tahunSelect) return; // Element doesn't exist in consolidated structure

    const tahunSekarang = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const tahun = tahunSekarang - i;
        const option = document.createElement('option');
        option.value = tahun;
        option.textContent = tahun;
        tahunSelect.appendChild(option);
    }
    tahunSelect.value = tahunSekarang;
    tahunSelect.addEventListener('change', loadReportData);
}

function setupDateRangeFilter() {
    const dateRange = document.getElementById('dateRange');
    const customDateGroup = document.getElementById('customDateGroup');

    dateRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateGroup.style.display = 'flex';
            // Set default dates
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            document.getElementById('startDate').value = lastMonth.toISOString().split('T')[0];
            document.getElementById('endDate').value = today.toISOString().split('T')[0];
        } else {
            customDateGroup.style.display = 'none';
        }
        loadReportData();
    });
}

// Consolidated reporting functions - old changeReportType removed

async function loadReportData() {
    try {
        const response = await fetch('/.netlify/functions/api');
        const data = await response.json();
        reportData = data;

        const dateRange = getDateRange();
        const filteredData = filterDataByDateRange(data, dateRange);

        // Always update the main dashboard
        updateSummaryReport(filteredData);

        // Update other sections based on current view (for future expansion)
        const activeSection = document.querySelector('.report-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            if (sectionId === 'breakdownSection') {
                // Load breakdown data when needed
            } else if (sectionId === 'analyticsSection') {
                // Load analytics data when needed
            }
        }

    } catch (error) {
        console.error('Error loading report data:', error);
        alert('Gagal memuat data laporan');
    }
}

function getDateRange() {
    const today = new Date();
    let startDate, endDate;

    // Use the consolidated date range selector
    const dateRangeElement = document.getElementById('dateRange');
    if (!dateRangeElement) {
        // Fallback to current month if element not found
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        return { startDate, endDate };
    }

    const dateRange = dateRangeElement.value;

    switch (dateRange) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = new Date(today);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today);
            break;
        case 'custom':
            const startDateElement = document.getElementById('startDate');
            const endDateElement = document.getElementById('endDate');
            if (startDateElement && endDateElement && startDateElement.value && endDateElement.value) {
                startDate = new Date(startDateElement.value);
                endDate = new Date(endDateElement.value);
            } else {
                // Fallback to current month
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
            }
            break;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
    }

    return {
        startDate,
        endDate
    };
}

function filterDataByDateRange(data, dateRange) {
    const {
        startDate,
        endDate
    } = dateRange;

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    let filteredData = { ...data };

    // For consolidated reports, filter all data by their respective dates
    const filteredKetetapan = (data.ketetapan || []).filter(k => {
        if (!k.TanggalKetetapan) return false;
        const ketetapanDate = new Date(k.TanggalKetetapan);
        return ketetapanDate >= startDate && ketetapanDate <= endDate;
    });

    const filteredPembayaran = (data.pembayaran || []).filter(p => {
        if (!p.TanggalBayar) return false;
        const pembayaranDate = new Date(p.TanggalBayar);
        return pembayaranDate >= startDate && pembayaranDate <= endDate;
    });

    const filteredWajibPajak = (data.wajibPajak || []).filter(wp => {
        if (!wp.tanggal_pendaftaran) return false;
        const daftarDate = new Date(wp.tanggal_pendaftaran);
        return daftarDate >= startDate && daftarDate <= endDate;
    });

    filteredData.ketetapan = filteredKetetapan;
    filteredData.pembayaran = filteredPembayaran;
    filteredData.wajibPajak = filteredWajibPajak;

    return filteredData;
}

function updateSummaryReport(data) {
    const totalRevenue = data.pembayaran.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
    const activeWp = data.wajibPajak?.length || 0;
    const totalKetetapan = data.ketetapan.length;
    const successPayment = data.pembayaran.filter(p => p.StatusPembayaran === 'Sukses').length;

    // Update main KPI cards
    document.getElementById('totalRevenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
    document.getElementById('activeWp').textContent = activeWp;
    document.getElementById('totalKetetapan').textContent = totalKetetapan;
    document.getElementById('successPayment').textContent = successPayment;

    // Update additional KPI cards
    updateAdditionalCards(data);

    // Update trend indicators
    updateTrendIndicators(data);

    // Initialize charts
    setTimeout(() => {
        updateObjectDistributionChart(data);
        updateMonthlyTrendChart(data);
        updateYearlyGrowthChart(data);
    }, 500);
}

function updateAdditionalCards(data) {
    // Calculate growth trend
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthRevenue = data.pembayaran
        .filter(p => {
            const date = new Date(p.TanggalBayar);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    const lastMonthRevenue = data.pembayaran
        .filter(p => {
            const date = new Date(p.TanggalBayar);
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    const growthRate = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;

    // Calculate compliance rate
    const totalKetetapan = data.ketetapan.length;
    const lunasKetetapan = data.ketetapan.filter(k => k.Status === 'Lunas').length;
    const complianceRate = totalKetetapan > 0 ? (lunasKetetapan / totalKetetapan * 100).toFixed(1) : 0;

    // Calculate object distribution
    const objectCount = new Set(data.ketetapan.map(k => k.KodeLayanan)).size;

    // Calculate process efficiency (mock data for now)
    const avgProcessTime = '2.1';

    // Update DOM elements
    document.getElementById('growthTrend').textContent = `${growthRate}%`;
    document.getElementById('complianceRate').textContent = `${complianceRate}%`;
    document.getElementById('objectCount').textContent = objectCount;
    document.getElementById('processEfficiency').textContent = `${avgProcessTime} hari`;

    // Update progress bars
    document.getElementById('growthProgress').style.width = `${Math.min(growthRate, 100)}%`;
    document.getElementById('complianceProgress').style.width = `${complianceRate}%`;
    document.getElementById('distributionProgress').style.width = '100%';
    document.getElementById('efficiencyProgress').style.width = '78%';

    // Update trend indicators with null checks for consolidated structure
    const growthTrendElement = document.getElementById('growthTrend');
    const complianceTrendElement = document.getElementById('complianceRate');

    if (growthTrendElement) {
        const growthTrend = growthTrendElement.closest('.summary-card')?.querySelector('.card-trend');
        if (growthTrend) {
            if (growthRate > 0) {
                growthTrend.textContent = `↗ +${growthRate}%`;
                growthTrend.className = 'card-trend positive';
            } else {
                growthTrend.textContent = `↘ ${growthRate}%`;
                growthTrend.className = 'card-trend negative';
            }
        }
    }

    if (complianceTrendElement) {
        const complianceTrend = complianceTrendElement.closest('.summary-card')?.querySelector('.card-trend');
        if (complianceTrend) {
            if (complianceRate >= 80) {
                complianceTrend.textContent = `↗ +${complianceRate}%`;
                complianceTrend.className = 'card-trend positive';
            } else {
                complianceTrend.textContent = `→ ${complianceRate}%`;
                complianceTrend.className = 'card-trend neutral';
            }
        }
    }
}

function updateTrendIndicators(data) {
    // Calculate trends for the new KPI cards
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Revenue trend
    const currentMonthRevenue = data.pembayaran
        .filter(p => {
            const date = new Date(p.TanggalBayar);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    const lastMonthRevenue = data.pembayaran
        .filter(p => {
            const date = new Date(p.TanggalBayar);
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const year = currentMonth === 0 ? currentYear - 1 : currentYear;
            return date.getMonth() === lastMonth && date.getFullYear() === year;
        })
        .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    const revenueGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;

    // WP trend
    const currentMonthWp = data.wajibPajak?.filter(wp => {
        if (!wp.tanggal_pendaftaran) return false;
        const date = new Date(wp.tanggal_pendaftaran);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length || 0;

    const lastMonthWp = data.wajibPajak?.filter(wp => {
        if (!wp.tanggal_pendaftaran) return false;
        const date = new Date(wp.tanggal_pendaftaran);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
    }).length || 0;

    const wpGrowth = lastMonthWp > 0 ? ((currentMonthWp - lastMonthWp) / lastMonthWp * 100).toFixed(1) : 0;

    // Ketetapan trend
    const currentMonthKetetapan = data.ketetapan.filter(k => {
        const date = new Date(k.TanggalKetetapan);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const lastMonthKetetapan = data.ketetapan.filter(k => {
        const date = new Date(k.TanggalKetetapan);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
    }).length;

    const ketetapanGrowth = lastMonthKetetapan > 0 ? ((currentMonthKetetapan - lastMonthKetetapan) / lastMonthKetetapan * 100).toFixed(1) : 0;

    // Payment trend
    const currentMonthPayments = data.pembayaran.filter(p => {
        const date = new Date(p.TanggalBayar);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && p.StatusPembayaran === 'Sukses';
    }).length;

    const lastMonthPayments = data.pembayaran.filter(p => {
        const date = new Date(p.TanggalBayar);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year && p.StatusPembayaran === 'Sukses';
    }).length;

    const paymentGrowth = lastMonthPayments > 0 ? ((currentMonthPayments - lastMonthPayments) / lastMonthPayments * 100).toFixed(1) : 0;

    // Update trend elements
    document.getElementById('revenueTrend').textContent = revenueGrowth > 0 ? `↗ +${revenueGrowth}%` : `↘ ${revenueGrowth}%`;
    document.getElementById('wpTrend').textContent = wpGrowth > 0 ? `↗ +${wpGrowth}%` : `↘ ${wpGrowth}%`;
    document.getElementById('ketetapanTrend').textContent = ketetapanGrowth > 0 ? `↗ +${ketetapanGrowth}%` : `→ ${ketetapanGrowth}%`;
    document.getElementById('paymentTrend').textContent = paymentGrowth > 0 ? `↗ +${paymentGrowth}%` : `↘ ${paymentGrowth}%`;
    document.getElementById('growthTrendCard').textContent = revenueGrowth > 0 ? `↗ +${revenueGrowth}%` : `↘ ${revenueGrowth}%`;
    document.getElementById('complianceTrendCard').textContent = `${complianceRate}%`;
    document.getElementById('distributionTrend').textContent = '→ Stabil';
    document.getElementById('efficiencyTrend').textContent = '↗ +12.8%';
}


function updateRevenueReport(data) {
    const masterList = reportData.masterPajak || [];
    const targetList = reportData.targetPajakRetribusi || [];
    const pembayaranList = data.pembayaran || [];
    const tahunDipilih = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();

    const breakdownContainer = document.getElementById('revenueBreakdown');
    breakdownContainer.innerHTML = '';

    // --- Perhitungan total tetap dipertahankan ---
    let totalKetetapan = 0;
    let totalRealisasi = 0;
    let totalKontribusi = 0;
    let totalCapaian = 0;
    let countCapaian = 0;
    const realisasiByKode = {};
    pembayaranList.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = (reportData.ketetapan || []).find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
        const amount = parseFloat(p.JumlahBayar) || 0;
        realisasiByKode[kode] += amount;
        totalRealisasi += amount;
    });
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        totalKetetapan += target;
    });
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        if (target > 0) {
            totalCapaian += (realisasi / target * 100);
            countCapaian++;
        }
    });
    const rataCapaian = countCapaian > 0 ? (totalCapaian / countCapaian).toFixed(1) : 0;

    // --- KARTU STATISTIK DIHILANGKAN ---
    // (Bagian statCard dihapus, hanya tabel dan baris total yang tampil)

    // --- HEADER TABEL ---
    const header = document.createElement('div');
    header.className = 'revenue-header';
    header.style.cssText = 'display: flex; font-weight: bold; gap: 16px; margin-bottom: 8px; padding: 8px; background-color: #f4f6f8; border-radius: 4px;';
    header.innerHTML = `
        <span style="flex: 3;">Jenis Pajak/Retribusi</span>
        <span style="flex: 2; text-align: right;">Realisasi</span>
        <span style="flex: 2; text-align: right;">Target ${tahunDipilih}</span>
        <span style="flex: 1; text-align: center;">Kontribusi</span>
        <span style="flex: 1; text-align: center;">Capaian</span>
    `;
    breakdownContainer.appendChild(header);

    // --- ISI TABEL ---
    let totalKontribusiTabel = 0;
    let totalCapaianTabel = 0;
    let countCapaianTabel = 0;
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        const kontribusi = totalRealisasi > 0 ? (realisasi / totalRealisasi * 100).toFixed(1) : 0;
        const capaian = target > 0 ? (realisasi / target * 100).toFixed(1) : 0;
        totalKontribusiTabel += parseFloat(kontribusi);
        if (target > 0) {
            totalCapaianTabel += parseFloat(capaian);
            countCapaianTabel++;
        }
        const item = document.createElement('div');
        item.className = 'revenue-item';
        item.style.cssText = 'display: flex; gap: 16px; padding: 8px; border-bottom: 1px solid #e0e0e0; align-items: center;';
        item.innerHTML = `
            <span style="flex: 3;">${nama}</span>
            <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(realisasi)}</span>
            <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(target)}</span>
            <span style="flex: 1; text-align: center;">${kontribusi}%</span>
            <span style="flex: 1; text-align: center; font-weight: bold; color: ${capaian >= 100 ? '#28a745' : (capaian >= 50 ? '#fd7e14' : '#dc3545')};">${capaian}%</span>
        `;
        breakdownContainer.appendChild(item);
    });

    // --- BARIS TOTAL DI BAWAH TABEL ---
    const totalRow = document.createElement('div');
    totalRow.className = 'revenue-total-row';
    totalRow.style.cssText = 'display: flex; gap: 16px; padding: 10px 8px; font-weight: bold; background: #e9ecef; border-radius: 4px; margin-top: 4px;';
    totalRow.innerHTML = `
        <span style="flex: 3; text-align: right;">TOTAL</span>
        <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRealisasi)}</span>
        <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalKetetapan)}</span>
        <span style="flex: 1; text-align: center;">100%</span>
        <span style="flex: 1; text-align: center; color: #007bff;">${countCapaianTabel > 0 ? (totalCapaianTabel / countCapaianTabel).toFixed(1) : 0}%</span>
    `;
    breakdownContainer.appendChild(totalRow);

    // Update chart
    const revenueForChart = {};
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const realisasi = realisasiByKode[kode] || 0;
        if (realisasi > 0) {
            revenueForChart[nama] = realisasi;
        }
    });
    updateRevenueChart(revenueForChart);
}

function updateRevenueChart(revenueByType) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) {
        console.warn('Revenue chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
    }
    const labels = Object.keys(revenueByType);
    const data = Object.values(revenueByType);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#839E9A'];

    window.revenueChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribusi Pendapatan per Jenis Pajak'
                },
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function updateWpReport(data) {
    const totalWp = data.wajibPajak?.length || 0;
    const activeWp = new Set(data.pembayaran.map(p => p.NPWPD)).size;

    document.getElementById('totalWpRegistered').textContent = totalWp;
    document.getElementById('activeWpCount').textContent = activeWp;
    document.getElementById('inactiveWpCount').textContent = totalWp - activeWp;

    const tbody = document.getElementById('wpTableBody');
    tbody.innerHTML = '';
    (data.wajibPajak || []).forEach(wpData => {
        const totalPayment = data.pembayaran
            .filter(p => p.NPWPD === wpData.NPWPD)
            .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
        const isActive = totalPayment > 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${wpData.NPWPD}</td>
            <td>${wpData['Nama Usaha'] || '-'}</td>
            <td>${wpData['Nama Pemilik'] || '-'}</td>
            <td>${wpData.JenisWP || '-'}</td>
            <td><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Aktif' : 'Non-Aktif'}</span></td>
            <td>Rp ${totalPayment.toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateKetetapanReport(data) {
    const totalKetetapan = data.ketetapan.length;
    const lunasCount = data.ketetapan.filter(k => k.Status === 'Lunas').length;
    const belumLunasCount = totalKetetapan - lunasCount;
    const totalNilai = data.ketetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);

    document.getElementById('totalKetetapanCount').textContent = totalKetetapan;
    document.getElementById('lunasCount').textContent = lunasCount;
    document.getElementById('belumLunasCount').textContent = belumLunasCount;
    document.getElementById('totalNilaiKetetapan').textContent = `Rp ${totalNilai.toLocaleString('id-ID')}`;

    // Group data by KodeLayanan untuk breakdown per objek
    const groupedByObjek = groupByKodeLayanan(data.ketetapan, data.masterPajak, 'TotalTagihan');
    const groupedWithPercentages = calculatePercentages(groupedByObjek, totalNilai);

    // Display tabel per objek
    displayPerObjekTable(groupedWithPercentages, 'ketetapanPerObjekBreakdown', 'ketetapan');

    const tbody = document.getElementById('ketetapanTableBody');
    tbody.innerHTML = '';
    data.ketetapan.forEach(k => {
        const masterPajak = reportData.masterPajak?.find(m => m.KodeLayanan === k.KodeLayanan);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${k.ID_Ketetapan}</td>
            <td>${k.NPWPD}</td>
            <td>${masterPajak?.NamaLayanan || k.KodeLayanan}</td>
            <td>${k.MasaPajak || '-'}</td>
            <td>Rp ${(parseFloat(k.TotalTagihan) || 0).toLocaleString('id-ID')}</td>
            <td><span class="status-badge ${k.Status === 'Lunas' ? 'success' : 'warning'}">${k.Status}</span></td>
            <td>${k.TanggalKetetapan ? new Date(k.TanggalKetetapan).toLocaleDateString('id-ID') : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

function updatePembayaranReport(data) {
    const totalPembayaran = data.pembayaran.length;
    const successCount = data.pembayaran.filter(p => p.StatusPembayaran === 'Sukses').length;
    const failedCount = totalPembayaran - successCount;
    const totalNilai = data.pembayaran.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    document.getElementById('totalPembayaranCount').textContent = totalPembayaran;
    document.getElementById('successCount').textContent = successCount;
    document.getElementById('failedCount').textContent = failedCount;
    document.getElementById('totalNilaiPembayaran').textContent = `Rp ${totalNilai.toLocaleString('id-ID')}`;

    // Group data by KodeLayanan untuk breakdown per objek
    const groupedByObjek = groupByKodeLayanan(data.pembayaran, data.masterPajak, 'JumlahBayar');
    const groupedWithPercentages = calculatePercentages(groupedByObjek, totalNilai);

    // Display tabel per objek
    displayPerObjekTable(groupedWithPercentages, 'pembayaranPerObjekBreakdown', 'pembayaran');

    // Populate table with payment data
    const tbody = document.getElementById('pembayaranTableBody');
    tbody.innerHTML = '';

    if (data.pembayaran.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; font-style: italic;">Belum ada data pembayaran.</td></tr>';
    } else {
        data.pembayaran.forEach((pembayaran, index) => {
            const row = document.createElement('tr');

            // Cari data wajib pajak untuk nama usaha
            const wpData = reportData.wajibPajak?.find(wp => wp.NPWPD === pembayaran.NPWPD);
            const namaUsaha = wpData?.['Nama Usaha'] || '-';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${pembayaran.ID_Pembayaran || '-'}</td>
                <td>${pembayaran.ID_Ketetapan || '-'}</td>
                <td>${pembayaran.TanggalBayar ? new Date(pembayaran.TanggalBayar).toLocaleDateString('id-ID') : '-'}</td>
                <td>Rp ${(parseFloat(pembayaran.JumlahBayar) || 0).toLocaleString('id-ID')}</td>
                <td>${pembayaran.MetodeBayar || '-'}</td>
                <td>${pembayaran.Operator || '-'}</td>
                <td><span class="status-badge ${pembayaran.StatusPembayaran === 'Sukses' ? 'success' : 'danger'}">${pembayaran.StatusPembayaran || '-'}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    updatePembayaranChart(data);
}

function updatePembayaranChart(data) {
    const canvas = document.getElementById('pembayaranChart');
    if (!canvas) {
        console.warn('Pembayaran chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.pembayaranChartInstance) {
        window.pembayaranChartInstance.destroy();
    }
    const monthlyData = {};
    data.pembayaran.forEach(p => {
        if (p.TanggalBayar) {
            const date = new Date(p.TanggalBayar);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
            monthlyData[monthKey] += parseFloat(p.JumlahBayar) || 0;
        }
    });
    const labels = Object.keys(monthlyData).sort();
    const values = labels.map(key => monthlyData[key]);

    window.pembayaranChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendapatan per Bulan',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tren Pembayaran per Bulan'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateFiskalReport(data) {
    const fiskalData = reportData.fiskal || [];
    const totalFiskal = fiskalData.length;
    const activeFiskal = fiskalData.filter(f => new Date(f.tanggal_berlaku) > new Date()).length;
    const expiredFiskal = totalFiskal - activeFiskal;

    document.getElementById('totalFiskalCount').textContent = totalFiskal;
    document.getElementById('activeFiskalCount').textContent = activeFiskal;
    document.getElementById('expiredFiskalCount').textContent = expiredFiskal;

    const tbody = document.getElementById('fiskalTableBody');
    tbody.innerHTML = '';
    if (fiskalData.length > 0) {
        fiskalData.forEach(f => {
            const wpData = reportData.wajibPajak?.find(w => w.NPWPD === f.NPWPD);
            const row = document.createElement('tr');
            const isExpired = new Date(f.tanggal_berlaku) < new Date();
            row.innerHTML = `
                <td>${f.nomor_fiskal || '-'}</td>
                <td>${f.NPWPD}</td>
                <td>${wpData?.['Nama Usaha'] || f['Nama Usaha'] || '-'}</td>
                <td>${f.tanggal_cetak ? new Date(f.tanggal_cetak).toLocaleDateString('id-ID') : '-'}</td>
                <td>${f.tanggal_berlaku ? new Date(f.tanggal_berlaku).toLocaleDateString('id-ID') : '-'}</td>
                <td><span class="status-badge ${isExpired ? 'inactive' : 'active'}">${isExpired ? 'Kadaluarsa' : 'Aktif'}</span></td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666; font-style: italic;">Belum ada data fiskal.</td></tr>`;
    }
}

function updatePerformanceReport(data) {
    const totalKetetapan = data.ketetapan.length;
    const lunasKetetapan = data.ketetapan.filter(k => k.Status === 'Lunas').length;
    const complianceRate = totalKetetapan > 0 ? (lunasKetetapan / totalKetetapan * 100).toFixed(1) : 0;

    document.getElementById('targetRealisasi').textContent = '85%';
    document.getElementById('avgProcessTime').textContent = '2.5 hari';
    document.getElementById('wpCompliance').textContent = `${complianceRate}%`;
    
    // Perbaikan: Menggunakan ID unik untuk elemen 'fill'
    const targetFill = document.getElementById('targetRealisasi-fill');
    if(targetFill) targetFill.style.width = '85%';
    
    const complianceFill = document.getElementById('wpCompliance-fill');
    if(complianceFill) complianceFill.style.width = `${complianceRate}%`;

    updatePerformanceChart(data);
}

function updatePerformanceChart(data) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) {
        console.warn('Performance chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.performanceChartInstance) {
        window.performanceChartInstance.destroy();
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    const complianceData = new Array(12).fill(0);
    const targetData = new Array(12).fill(85);

    for (let month = 0; month < 12; month++) {
        const monthKetetapan = data.ketetapan.filter(k => {
            if (!k.TanggalKetetapan) return false;
            const date = new Date(k.TanggalKetetapan);
            return date.getFullYear() === currentYear && date.getMonth() === month;
        });
        const monthLunas = monthKetetapan.filter(k => k.Status === 'Lunas').length;
        complianceData[month] = monthKetetapan.length > 0 ? (monthLunas / monthKetetapan.length * 100) : 0;
    }

    window.performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Target Kepatuhan',
                data: targetData,
                borderColor: '#FF6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderDash: [5, 5],
                tension: 0.4
            }, {
                label: 'Realisasi Kepatuhan',
                data: complianceData,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Kinerja Kepatuhan Wajib Pajak'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateObjectDistributionChart(data) {
    const canvas = document.getElementById('objectDistributionChart');
    if (!canvas) {
        console.warn('Object distribution chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.objectDistributionChartInstance) {
        window.objectDistributionChartInstance.destroy();
    }

    // Group pembayaran by KodeLayanan
    const groupedData = groupByKodeLayanan(data.pembayaran, data.masterPajak, 'JumlahBayar');
    const labels = [];
    const values = [];
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#839E9A'];

    Object.values(groupedData).forEach((objek, index) => {
        if (objek.total > 0) {
            labels.push(objek.nama);
            values.push(objek.total);
        }
    });

    window.objectDistributionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribusi Pendapatan per Objek Pajak',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: Rp ${value.toLocaleString('id-ID')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyTrendChart(data) {
    const canvas = document.getElementById('monthlyTrendChart');
    if (!canvas) {
        console.warn('Monthly trend chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.monthlyTrendChartInstance) {
        window.monthlyTrendChartInstance.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    const revenueData = new Array(12).fill(0);
    const ketetapanData = new Array(12).fill(0);

    data.pembayaran.forEach(p => {
        if (p.TanggalBayar) {
            const date = new Date(p.TanggalBayar);
            if (date.getFullYear() === currentYear) {
                revenueData[date.getMonth()] += parseFloat(p.JumlahBayar) || 0;
            }
        }
    });

    data.ketetapan.forEach(k => {
        if (k.TanggalKetetapan) {
            const date = new Date(k.TanggalKetetapan);
            if (date.getFullYear() === currentYear) {
                ketetapanData[date.getMonth()]++;
            }
        }
    });

    window.monthlyTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Pendapatan (Juta Rupiah)',
                data: revenueData.map(v => v / 1000000),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Jumlah Ketetapan',
                data: ketetapanData,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tren Bulanan Pendapatan & Ketetapan',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Pendapatan (Juta Rp)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Jumlah Ketetapan'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function updateYearlyGrowthChart(data) {
    const canvas = document.getElementById('yearlyGrowthChart');
    if (!canvas) {
        console.warn('Yearly growth chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (window.yearlyGrowthChartInstance) {
        window.yearlyGrowthChartInstance.destroy();
    }

    // Calculate yearly data for the last 3 years
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const revenueData = [];
    const ketetapanData = [];
    const complianceData = [];

    years.forEach(year => {
        // Revenue data
        const yearRevenue = data.pembayaran
            .filter(p => {
                const date = new Date(p.TanggalBayar);
                return date.getFullYear() === year;
            })
            .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

        // Ketetapan data
        const yearKetetapan = data.ketetapan
            .filter(k => {
                const date = new Date(k.TanggalKetetapan);
                return date.getFullYear() === year;
            })
            .length;

        // Compliance data
        const yearKetetapanList = data.ketetapan.filter(k => {
            const date = new Date(k.TanggalKetetapan);
            return date.getFullYear() === year;
        });
        const yearLunas = yearKetetapanList.filter(k => k.Status === 'Lunas').length;
        const yearCompliance = yearKetetapanList.length > 0 ? (yearLunas / yearKetetapanList.length * 100) : 0;

        revenueData.push(yearRevenue / 1000000); // Convert to millions
        ketetapanData.push(yearKetetapan);
        complianceData.push(yearCompliance);
    });

    window.yearlyGrowthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Pendapatan (Juta Rp)',
                data: revenueData,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Jumlah Ketetapan',
                data: ketetapanData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }, {
                label: 'Kepatuhan (%)',
                data: complianceData,
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                tension: 0.4,
                yAxisID: 'y2'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Pertumbuhan Tahunan',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Pendapatan (Juta Rp)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Jumlah Ketetapan'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Kepatuhan (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

async function exportReport() {
    console.log('=== EXPORT REPORT FUNCTION STARTED ===');

    // Wait for PDF functions to be loaded
    console.log('Waiting for PDF functions to load...');
    const functionsLoaded = await waitForPdfFunctions(3000);

    const availableFunctions = checkPdfFunctionsLoaded();
    console.log('Available functions:', availableFunctions);
    console.log('Report Data Available:', !!reportData);

    if (!functionsLoaded) {
        console.warn('PDF functions not fully loaded, but continuing with available functions');
    }

    // For consolidated reports, export comprehensive dashboard report
    console.log('=== CONSOLIDATED DASHBOARD EXPORT ===');
    const { startDate, endDate } = getDateRange();

    console.log('Consolidated Export params:', { startDate, endDate, reportData: !!reportData });

    // Export comprehensive dashboard report
    if (typeof window.exportPendapatanToPDF === 'function') {
        try {
            const tahun = new Date().getFullYear().toString();
            const periodeLabel = getPeriodeLabel();

            window.exportPendapatanToPDF({
                reportData,
                periodeLabel,
                tahun,
                startDate,
                endDate,
                isConsolidated: true
            });
            console.log('Consolidated dashboard export function called successfully');
        } catch (error) {
            console.error('Consolidated export error:', error);
            alert('Error saat export PDF: ' + error.message);
        }
    } else {
        console.error('exportPendapatanToPDF function not found');
        alert('Fungsi export PDF belum tersedia! Silakan refresh halaman.');
    }
}

// Helper label periode dinamis
function getPeriodeLabel() {
    const tahun = new Date().getFullYear().toString();
    const dateRangeElement = document.getElementById('dateRange');

    if (!dateRangeElement) return `Tahun ${tahun}`;

    const dateRange = dateRangeElement.value;

    if (dateRange === 'custom') {
        const startElement = document.getElementById('startDate');
        const endElement = document.getElementById('endDate');
        if (startElement && endElement && startElement.value && endElement.value) {
            const s = new Date(startElement.value);
            const e = new Date(endElement.value);
            return `${s.getDate()} ${getNamaBulan(s.getMonth())} ${s.getFullYear()} – ${e.getDate()} ${getNamaBulan(e.getMonth())} ${e.getFullYear()}`;
        }
    }
    if (dateRange === 'month') {
        const now = new Date();
        return `${getNamaBulan(now.getMonth())} ${tahun}`;
    }
    if (dateRange === 'quarter') {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `Triwulan ${q} ${tahun}`;
    }
    if (dateRange === 'year') {
        return `Tahun ${tahun}`;
    }
    // Default: tampilkan bulan berjalan
    const now = new Date();
    return `${getNamaBulan(now.getMonth())} ${tahun}`;
}
function getNamaBulan(idx) {
    return [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][idx] || '';
}

function exportExcel() {
    alert('Fitur export Excel akan segera tersedia');
}

async function testPdfFunctions() {
    console.log('=== PDF FUNCTIONS TEST ===');

    // Check current function availability
    const functionsBefore = checkPdfFunctionsLoaded();
    console.log('Functions before wait:', functionsBefore);

    // Wait for functions to load
    const functionsLoaded = await waitForPdfFunctions(2000);
    const functionsAfter = checkPdfFunctionsLoaded();

    console.log('Functions after wait:', functionsAfter);
    console.log('All functions loaded:', functionsLoaded);
    console.log('Report Data Available:', !!reportData);
    console.log('Data details:', {
        wajibPajak: reportData?.wajibPajak?.length || 0,
        ketetapan: reportData?.ketetapan?.length || 0,
        pembayaran: reportData?.pembayaran?.length || 0,
        fiskal: reportData?.fiskal?.length || 0
    });

    const message = `
=== PDF FUNCTIONS STATUS ===
Consolidated Dashboard Report

📊 FUNCTION AVAILABILITY:
WP Export: ${functionsAfter.wp ? '✅ Available' : '❌ Not Available'}
Ketetapan Export: ${functionsAfter.ketetapan ? '✅ Available' : '❌ Not Available'}
Pembayaran Export: ${functionsAfter.pembayaran ? '✅ Available' : '❌ Not Available'}
Fiskal Export: ${functionsAfter.fiskal ? '✅ Available' : '❌ Not Available'}
Revenue Export: ${functionsAfter.pendapatan ? '✅ Available' : '❌ Not Available'}

📈 DATA AVAILABILITY:
Report Data: ${!!reportData ? '✅ Loaded' : '❌ Not Loaded'}
WP Records: ${reportData?.wajibPajak?.length || 0}
Ketetapan Records: ${reportData?.ketetapan?.length || 0}
Pembayaran Records: ${reportData?.pembayaran?.length || 0}
Fiskal Records: ${reportData?.fiskal?.length || 0}

🔧 TROUBLESHOOTING:
- If functions are not available, try refreshing the page
- Check browser console (F12) for detailed error logs
- Ensure cetakreport.js is loaded properly
    `;

    alert(message);

    // Test consolidated dashboard export
    if (typeof window.exportPendapatanToPDF === 'function') {
        console.log('Testing consolidated dashboard export function directly...');
        try {
            const { startDate, endDate } = getDateRange();
            const tahun = new Date().getFullYear().toString();
            const periodeLabel = getPeriodeLabel();

            window.exportPendapatanToPDF({
                reportData,
                periodeLabel,
                tahun,
                startDate,
                endDate,
                isConsolidated: true
            });
            console.log('Direct consolidated export call successful');
        } catch (error) {
            console.error('Direct consolidated export call failed:', error);
            alert('Direct call failed: ' + error.message);
        }
    }
}

// Cleanup function for page navigation
window.addEventListener('beforeunload', function() {
    console.log('=== REPORT.JS CLEANUP ON PAGE UNLOAD ===');
    // Clear report data and any timers
    reportData = {};
    window.reportInitialized = false;

    // Destroy any chart instances
    if (window.summaryChartInstance) {
        window.summaryChartInstance.destroy();
        window.summaryChartInstance = null;
    }
    if (window.objectDistributionChartInstance) {
        window.objectDistributionChartInstance.destroy();
        window.objectDistributionChartInstance = null;
    }
    if (window.monthlyTrendChartInstance) {
        window.monthlyTrendChartInstance.destroy();
        window.monthlyTrendChartInstance = null;
    }
    if (window.yearlyGrowthChartInstance) {
        window.yearlyGrowthChartInstance.destroy();
        window.yearlyGrowthChartInstance = null;
    }
});
