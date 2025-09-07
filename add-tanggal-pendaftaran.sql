-- =================================================================
-- MENAMBAHKAN KOLOM TANGGAL PENDAFTARAN KE TABEL DATAWP
-- =================================================================

-- Menambahkan kolom tanggal_pendaftaran dengan default nilai NOW()
ALTER TABLE datawp
ADD COLUMN IF NOT EXISTS tanggal_pendaftaran TIMESTAMP DEFAULT NOW();

-- Update data yang sudah ada dengan tanggal sekarang (jika belum ada nilai)
UPDATE datawp
SET tanggal_pendaftaran = NOW()
WHERE tanggal_pendaftaran IS NULL;

-- Membuat index untuk optimasi query berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_datawp_tanggal_pendaftaran
ON datawp(tanggal_pendaftaran);

-- =================================================================
-- CATATAN PENTING
-- =================================================================
/*
1. Jalankan query ALTER TABLE di atas untuk menambahkan kolom tanggal_pendaftaran
2. Kolom ini akan otomatis terisi dengan NOW() untuk data baru
3. Untuk data lama, akan diisi dengan NOW() saat query UPDATE dijalankan
4. Index dibuat untuk mengoptimalkan query sorting berdasarkan tanggal
5. Pastikan untuk backup database sebelum menjalankan query ini
*/