-- =================================================================
-- TABEL UNTUK SISTEM NOTIFIKASI WHATSAPP
-- =================================================================

-- Tabel untuk menyimpan preferensi notifikasi user
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    npwpd VARCHAR PRIMARY KEY,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    whatsapp_notifications BOOLEAN DEFAULT true,
    email VARCHAR,
    phone VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel untuk log notifikasi yang dikirim
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    npwpd VARCHAR,
    notification_type VARCHAR, -- 'registration', 'ketetapan', 'payment', 'fiskal'
    channel VARCHAR, -- 'email', 'push', 'whatsapp'
    status VARCHAR, -- 'sent', 'delivered', 'failed'
    message TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    error_message TEXT
);

-- Tabel untuk scheduled notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id SERIAL PRIMARY KEY,
    npwpd VARCHAR,
    notification_type VARCHAR,
    scheduled_at TIMESTAMP,
    data JSONB, -- additional data for the notification
    status VARCHAR DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_notification_logs_npwpd ON notification_logs(npwpd);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_npwpd ON scheduled_notifications(npwpd);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_at ON scheduled_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- =================================================================
-- CONTOH PENGGUNAAN
-- =================================================================

-- Insert preferensi notifikasi untuk wajib pajak
INSERT INTO user_notification_preferences (npwpd, phone, whatsapp_notifications)
VALUES ('P.1.001.01.001', '+6281234567890', true);

-- Log notifikasi yang dikirim
INSERT INTO notification_logs (npwpd, notification_type, channel, status, message)
VALUES ('P.1.001.01.001', 'registration', 'whatsapp', 'sent', 'Selamat bergabung!');

-- Schedule notifikasi untuk reminder fiskal
INSERT INTO scheduled_notifications (npwpd, notification_type, scheduled_at, data)
VALUES ('P.1.001.01.001', 'fiskal_reminder', '2024-12-01 09:00:00',
        '{"hariTersisa": 30, "tanggalJatuhTempo": "2024-12-31"}');

-- =================================================================
-- CATATAN PENTING
-- =================================================================
/*
1. Jalankan query CREATE TABLE di atas untuk membuat tabel-tabel notifikasi
2. Pastikan kolom phone diisi dengan format internasional (+62xxxxxxxxxx)
3. Untuk testing, gunakan nomor yang sudah terdaftar di Twilio WhatsApp Sandbox
4. Monitor tabel notification_logs untuk tracking pengiriman notifikasi
5. Gunakan scheduled_notifications untuk notifikasi terjadwal seperti reminder fiskal
*/