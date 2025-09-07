-- Create Operators Table Migration
-- Run this SQL in your Supabase SQL Editor

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    nama_operator VARCHAR(100) NOT NULL UNIQUE,
    jabatan VARCHAR(100),
    departemen VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operators_status ON operators(status);
CREATE INDEX IF NOT EXISTS idx_operators_nama ON operators(nama_operator);

-- Insert sample operators
INSERT INTO operators (nama_operator, jabatan, departemen, status) VALUES
('Ahmad Surya', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Budi Santoso', 'Petugas Pajak', 'Pendapatan Daerah', 'active'),
('Citra Dewi', 'Petugas Retribusi', 'Pendapatan Daerah', 'active'),
('Dedi Kurniawan', 'Kepala Seksi', 'Pendapatan Daerah', 'active'),
('Eka Putri', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Fajar Ramadhan', 'Petugas Pajak', 'Pendapatan Daerah', 'active'),
('Gita Sari', 'Petugas Retribusi', 'Pendapatan Daerah', 'active'),
('Hendra Gunawan', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Indah Permata', 'Petugas Pajak', 'Pendapatan Daerah', 'active'),
('Joko Widodo', 'Kepala Bidang', 'Pendapatan Daerah', 'active'),
('Kartika Sari', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Lutfi Rahman', 'Petugas Retribusi', 'Pendapatan Daerah', 'active'),
('Maya Sari', 'Petugas Pajak', 'Pendapatan Daerah', 'active'),
('Nanda Putra', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Olivia Tan', 'Petugas Retribusi', 'Pendapatan Daerah', 'active'),
('Putra Mahendra', 'Petugas Pajak', 'Pendapatan Daerah', 'active'),
('Rina Amelia', 'Petugas Administrasi', 'Pendapatan Daerah', 'active'),
('Siti Nurhaliza', 'Kepala Seksi', 'Pendapatan Daerah', 'active'),
('Taufik Hidayat', 'Petugas Retribusi', 'Pendapatan Daerah', 'active')
ON CONFLICT (nama_operator) DO NOTHING;

-- Verify the data
SELECT * FROM operators ORDER BY nama_operator;