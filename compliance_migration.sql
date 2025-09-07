-- Compliance Tracking Migration for MCP (Indeks Pencegahan Korupsi)
-- Version 1.0 - Taxpayer Management Module
-- Date: September 2025

-- =====================================================
-- MIGRATION: Add Compliance Fields to datawp table
-- =====================================================

-- EMERGENCY FIX: Drop any existing problematic triggers first
DROP TRIGGER IF EXISTS trigger_wp_compliance_update ON datawp;
DROP FUNCTION IF EXISTS trigger_update_compliance();

-- Backup existing data (recommended before running migration)
-- pg_dump -h your_host -U your_user -d your_database -t datawp > datawp_backup_pre_compliance.sql

-- Add compliance tracking fields to datawp table
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 0;
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS last_compliance_check DATE DEFAULT CURRENT_DATE;
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS regulatory_notes TEXT;
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]';
ALTER TABLE datawp ADD COLUMN IF NOT EXISTS compliance_history JSONB DEFAULT '[]';

-- =====================================================
-- MIGRATION: Create Regulatory Documents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS regulatory_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL, -- 'perkada', 'sk_kepala_daerah', 'sop'
    document_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    issue_date DATE,
    effective_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'expired'
    file_path VARCHAR(500),
    summary TEXT,
    keywords TEXT[], -- For search functionality
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_type ON regulatory_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_status ON regulatory_documents(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_number ON regulatory_documents(document_number);

-- =====================================================
-- MIGRATION: Create Compliance Audit Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id SERIAL PRIMARY KEY,
    wp_npwpd VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'check', 'flag'
    old_compliance_score INTEGER,
    new_compliance_score INTEGER,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    regulatory_reference VARCHAR(255),
    notes TEXT,
    performed_by VARCHAR(100), -- User who performed the action
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (wp_npwpd) REFERENCES datawp("NPWPD") ON DELETE CASCADE
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_compliance_audit_wp ON compliance_audit_log(wp_npwpd);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_date ON compliance_audit_log(performed_at);

-- =====================================================
-- MIGRATION: Create MCP Reporting Table
-- =====================================================

CREATE TABLE IF NOT EXISTS mcp_compliance_reports (
    id SERIAL PRIMARY KEY,
    report_period VARCHAR(20) NOT NULL, -- '2025_Q1', '2025_annual'
    total_taxpayers INTEGER DEFAULT 0,
    compliant_taxpayers INTEGER DEFAULT 0,
    warning_taxpayers INTEGER DEFAULT 0,
    non_compliant_taxpayers INTEGER DEFAULT 0,
    average_compliance_score DECIMAL(5,2) DEFAULT 0.00,
    regulatory_coverage_score DECIMAL(5,2) DEFAULT 0.00,
    audit_readiness_score DECIMAL(5,2) DEFAULT 0.00,
    overall_mcp_score DECIMAL(5,2) DEFAULT 0.00,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100)
);

-- =====================================================
-- DATA SEEDING: Sample Regulatory Documents
-- =====================================================

-- Insert sample regulatory documents (uncomment to use)
INSERT INTO regulatory_documents (document_type, document_number, title, issue_date, status) VALUES
('perkada', '01/2024', 'Peraturan Daerah tentang Pajak Daerah', '2024-01-15', 'active'),
('perkada', '02/2024', 'Peraturan Daerah tentang Retribusi Daerah', '2024-02-20', 'active'),
('sk_kepala_daerah', 'SK.01/2024', 'SOP Pemungutan Pajak Daerah', '2024-03-01', 'active'),
('sk_kepala_daerah', 'SK.02/2024', 'SOP Pengawasan Pajak Daerah', '2024-03-15', 'active'),
('sop', 'SOP-001/2024', 'Peta Jalan Elektronifikasi Transaksi', '2024-04-01', 'active')
ON CONFLICT (document_number) DO NOTHING;

-- =====================================================
-- VIEWS: Useful Views for Compliance Reporting
-- =====================================================

-- View for compliance summary
CREATE OR REPLACE VIEW compliance_summary AS
SELECT
    compliance_status,
    COUNT(*) as count,
    ROUND(AVG(compliance_score), 2) as avg_score,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM datawp
WHERE compliance_status IS NOT NULL
GROUP BY compliance_status;

-- View for regulatory compliance overview
CREATE OR REPLACE VIEW regulatory_compliance_overview AS
SELECT
    rd.document_type,
    COUNT(rd.id) as total_documents,
    COUNT(CASE WHEN rd.status = 'active' THEN 1 END) as active_documents,
    COUNT(CASE WHEN rd.status = 'expired' THEN 1 END) as expired_documents
FROM regulatory_documents rd
GROUP BY rd.document_type;

-- =====================================================
-- FUNCTIONS: Useful Functions for Compliance
-- =====================================================

-- Function to calculate compliance score
CREATE OR REPLACE FUNCTION calculate_compliance_score(
    p_npwpd VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    wp_record RECORD;
    score INTEGER := 0;
    max_score INTEGER := 100;
BEGIN
    -- Get WP record
    SELECT * INTO wp_record FROM datawp WHERE "NPWPD" = p_npwpd;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Calculate score based on available data
    -- NPWPD (25 points)
    IF wp_record."NPWPD" IS NOT NULL AND LENGTH(wp_record."NPWPD") > 0 THEN
        score := score + 25;
    END IF;

    -- NIK KTP (25 points)
    IF wp_record."NIK KTP" IS NOT NULL AND LENGTH(wp_record."NIK KTP") > 0 THEN
        score := score + 25;
    END IF;

    -- Alamat/Domisili (20 points)
    IF wp_record."Alamat" IS NOT NULL AND LENGTH(wp_record."Alamat") > 0 THEN
        score := score + 20;
    END IF;

    -- Foto (15 points - assume if any photo exists)
    IF (wp_record."Foto Pemilik" IS NOT NULL AND LENGTH(wp_record."Foto Pemilik") > 0) OR
       (wp_record."Foto Tempat Usaha" IS NOT NULL AND LENGTH(wp_record."Foto Tempat Usaha") > 0) OR
       (wp_record."Foto KTP" IS NOT NULL AND LENGTH(wp_record."Foto KTP") > 0) THEN
        score := score + 15;
    END IF;

    -- Nama Usaha (15 points)
    IF wp_record."Nama Usaha" IS NOT NULL AND LENGTH(wp_record."Nama Usaha") > 0 THEN
        score := score + 15;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update compliance status
CREATE OR REPLACE FUNCTION update_compliance_status(
    p_npwpd VARCHAR(50)
) RETURNS VOID AS $$
DECLARE
    new_score INTEGER;
    new_status VARCHAR(20);
BEGIN
    -- Calculate new score
    new_score := calculate_compliance_score(p_npwpd);

    -- Determine status
    IF new_score >= 90 THEN
        new_status := 'compliant';
    ELSIF new_score >= 70 THEN
        new_status := 'warning';
    ELSE
        new_status := 'non_compliant';
    END IF;

    -- Update record
    UPDATE datawp
    SET
        compliance_score = new_score,
        compliance_status = new_status,
        last_compliance_check = CURRENT_DATE
    WHERE "NPWPD" = p_npwpd;

    -- Log the change
    INSERT INTO compliance_audit_log (
        wp_npwpd, action_type, old_compliance_score, new_compliance_score,
        old_status, new_status, notes
    )
    SELECT
        p_npwpd, 'auto_update', compliance_score, new_score,
        compliance_status, new_status, 'Automatic compliance update'
    FROM datawp
    WHERE "NPWPD" = p_npwpd;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Automatic Compliance Updates (DISABLED)
-- =====================================================

-- NOTE: Trigger disabled to prevent stack overflow
-- Manual compliance updates should be done via application logic
-- or scheduled jobs to avoid recursive trigger calls

-- Trigger to automatically update compliance when WP data changes
-- CREATE OR REPLACE FUNCTION trigger_update_compliance() RETURNS TRIGGER AS $$
-- BEGIN
--     -- Only update if compliance fields are not being updated
--     IF (TG_OP = 'INSERT') OR
--        (TG_OP = 'UPDATE' AND
--         (OLD.compliance_status IS DISTINCT FROM NEW.compliance_status OR
--          OLD.compliance_score IS DISTINCT FROM NEW.compliance_score)) THEN
--         -- Update compliance for the affected WP
--         PERFORM update_compliance_status(NEW."NPWPD");
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create trigger (DISABLED)
-- DROP TRIGGER IF EXISTS trigger_wp_compliance_update ON datawp;
-- CREATE TRIGGER trigger_wp_compliance_update
--     AFTER INSERT OR UPDATE ON datawp
--     FOR EACH ROW EXECUTE FUNCTION trigger_update_compliance();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- =====================================================
-- EMERGENCY RPC FUNCTION: Insert without triggers
-- =====================================================

CREATE OR REPLACE FUNCTION insert_wp_without_triggers(wp_data JSONB)
RETURNS JSONB AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Insert data with triggers disabled for this session
    SET session_replication_role = replica;

    INSERT INTO datawp (
        "NPWPD", "JenisWP", "Nama Usaha", "Nama Pemilik", "NIK KTP",
        "Alamat", "Telephone", "Kelurahan", "Kecamatan",
        "Foto Pemilik", "Foto Tempat Usaha", "Foto KTP",
        tanggal_pendaftaran,
        compliance_status, compliance_score, regulatory_notes,
        required_documents, compliance_history
    ) VALUES (
        wp_data->>'NPWPD',
        wp_data->>'JenisWP',
        wp_data->>'Nama Usaha',
        wp_data->>'Nama Pemilik',
        wp_data->>'NIK KTP',
        wp_data->>'Alamat',
        wp_data->>'Telephone',
        wp_data->>'Kelurahan',
        wp_data->>'Kecamatan',
        COALESCE(wp_data->>'Foto Pemilik', ''),
        COALESCE(wp_data->>'Foto Tempat Usaha', ''),
        COALESCE(wp_data->>'Foto KTP', ''),
        COALESCE((wp_data->>'tanggal_pendaftaran')::timestamp, CURRENT_TIMESTAMP),
        COALESCE(wp_data->>'compliance_status', 'unknown'),
        COALESCE((wp_data->>'compliance_score')::integer, 0),
        COALESCE(wp_data->>'regulatory_notes', ''),
        COALESCE(wp_data->'required_documents', '[]'::jsonb),
        COALESCE(wp_data->'compliance_history', '[]'::jsonb)
    )
    RETURNING * INTO result_record;

    -- Re-enable triggers
    SET session_replication_role = DEFAULT;

    RETURN row_to_json(result_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- =====================================================
-- MIGRATION: Create Operators Table
-- =====================================================

CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    nama_operator VARCHAR(100) NOT NULL UNIQUE,
    jabatan VARCHAR(100),
    departemen VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
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

-- =====================================================
-- MIGRATION: Update API to include operators
-- =====================================================

-- Verify migration
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'datawp' AND column_name LIKE '%compliance%';
-- SELECT * FROM compliance_summary;
-- SELECT * FROM regulatory_documents LIMIT 5;
-- SELECT * FROM operators ORDER BY nama_operator;