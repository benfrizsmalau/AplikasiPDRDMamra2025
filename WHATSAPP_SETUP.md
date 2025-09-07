# 📱 WhatsApp Notifications Setup Guide

Panduan lengkap untuk mengatur dan menggunakan sistem notifikasi WhatsApp gratis di aplikasi pajak.

## 🚀 Quick Start

### 1. Setup Twilio Account
1. Daftar di [twilio.com](https://twilio.com)
2. Verifikasi nomor telepon Anda
3. Aktifkan WhatsApp Sandbox di Messaging > Try it out > WhatsApp

### 2. Configure Environment
Tambahkan credentials Twilio ke file `.env`:
```env
TWILIO_ACCOUNT_SID=AC71d753145722e1cacf0a9fa77f17b503
TWILIO_AUTH_TOKEN=918005c5a5114166e96d20c6483d7ab0
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database Tables
Jalankan query SQL di `create-notification-tables.sql` untuk membuat tabel:
- `user_notification_preferences`
- `notification_logs`
- `scheduled_notifications`

### 5. Test Setup
1. Buka halaman `test-whatsapp.html`
2. Daftarkan nomor WhatsApp Anda di Twilio Sandbox
3. Kirim pesan "join" ke nomor sandbox
4. Test kirim pesan dari aplikasi

## 📋 Daftar Nomor Sandbox

Untuk testing, Anda perlu mendaftarkan nomor WhatsApp Anda di Twilio Sandbox:

### Cara Daftar:
1. Kirim pesan WhatsApp ke: `+1 (415) 523-8886`
2. Format pesan: `join <your-sandbox-keyword>`
3. Anda akan menerima konfirmasi dari Twilio

### Contoh:
```
join hello-world
```

## 🎯 Jenis Notifikasi

### 1. **Test Message** (`test`)
```
🧪 *TEST WHATSAPP*

Halo! Ini adalah pesan test dari sistem notifikasi pajak.

Jika Anda menerima pesan ini, berarti WhatsApp notifications sudah bekerja! ✅
```

### 2. **Pendaftaran** (`registration`)
```
🎉 *SELAMAT BERGABUNG!*

Halo Toko ABC!

Anda telah berhasil terdaftar sebagai Wajib Pajak dengan:
📋 *NPWPD*: P.1.001.01.001
🏢 *Nama Usaha*: Toko ABC

Terima kasih telah bergabung dengan sistem kami! 🚀
```

### 3. **Pengingat Ketetapan** (`ketetapan`)
```
💰 *PENGINGAT PEMBAYARAN*

Halo Toko ABC!

Ketetapan pajak Anda telah diterbitkan:
📄 *No. Ketetapan*: KT-001/2024
💵 *Jumlah*: Rp 1.500.000
⏰ *Jatuh Tempo*: 15/12/2024

Silakan lakukan pembayaran sebelum tanggal jatuh tempo. 💳
```

### 4. **Pembayaran Berhasil** (`payment_success`)
```
✅ *PEMBAYARAN BERHASIL!*

Terima kasih Toko ABC!

Pembayaran sebesar Rp 1.500.000 telah berhasil diproses.

Status: *LUNAS* ✅
Tanggal: 10/09/2024

Simpan bukti pembayaran ini sebagai referensi. 📄
```

### 5. **Reminder Fiskal** (`fiskal_reminder`)
```
⚠️ *PENGINGAT FISKAL*

Halo Toko ABC!

Fiskal Anda akan jatuh tempo dalam 30 hari lagi:
📅 *Jatuh Tempo*: 31/12/2024

Segera perpanjang fiskal Anda untuk menghindari denda! 🏢
```

## 🔧 API Usage

### Kirim Notifikasi Manual
```javascript
const response = await fetch('/.netlify/functions/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'sendWhatsApp',
        npwpd: 'P.1.001.01.001',
        type: 'registration',
        customData: {
            jumlah: 1500000,
            jatuhTempo: '2024-12-31'
        }
    })
});
```

### Response Format
```json
{
    "status": "sukses",
    "success": true,
    "message": "Pesan WhatsApp berhasil dikirim",
    "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "error": null
}
```

## 📊 Monitoring & Logs

### Cek Log Notifikasi
```sql
SELECT * FROM notification_logs
WHERE npwpd = 'P.1.001.01.001'
ORDER BY sent_at DESC
LIMIT 10;
```

### Cek Status Pengiriman
```sql
SELECT
    notification_type,
    status,
    COUNT(*) as total
FROM notification_logs
GROUP BY notification_type, status;
```

## 🔄 Auto-trigger Notifications

### 1. **Trigger Saat Pendaftaran**
Tambahkan di fungsi `handleCreateWp`:
```javascript
// Setelah WP berhasil dibuat
await handleSendWhatsApp({
    npwpd: wpData.NPWPD,
    type: 'registration'
});
```

### 2. **Trigger Saat Ketetapan Dibuat**
Tambahkan di fungsi `handleCreateKetetapan`:
```javascript
await handleSendWhatsApp({
    npwpd: ketetapanData.NPWPD,
    type: 'ketetapan',
    customData: {
        noKetetapan: ketetapanData.ID_Ketetapan,
        jumlah: ketetapanData.TotalTagihan,
        jatuhTempo: ketetapanData.TanggalJatuhTempo
    }
});
```

### 3. **Trigger Saat Pembayaran**
Tambahkan di fungsi `handleCreatePembayaran`:
```javascript
await handleSendWhatsApp({
    npwpd: pembayaranData.NPWPD,
    type: 'payment_success',
    customData: {
        jumlah: pembayaranData.JumlahBayar,
        tanggalBayar: pembayaranData.TanggalBayar
    }
});
```

## ⚙️ Advanced Configuration

### Scheduled Notifications
```sql
-- Schedule reminder fiskal 30 hari sebelum jatuh tempo
INSERT INTO scheduled_notifications (
    npwpd,
    notification_type,
    scheduled_at,
    data
) VALUES (
    'P.1.001.01.001',
    'fiskal_reminder',
    '2024-12-01 09:00:00',
    '{"hariTersisa": 30, "tanggalJatuhTempo": "2024-12-31"}'
);
```

### User Preferences
```sql
-- Set preferensi notifikasi user
INSERT INTO user_notification_preferences (
    npwpd,
    whatsapp_notifications,
    phone
) VALUES (
    'P.1.001.01.001',
    true,
    '+6281234567890'
);
```

## 🚨 Troubleshooting

### Error: "Twilio client not initialized"
- ✅ Pastikan credentials Twilio sudah benar di `.env`
- ✅ Restart aplikasi Netlify

### Error: "Nomor WhatsApp tidak ditemukan"
- ✅ Pastikan kolom `Telephone` di tabel `datawp` terisi
- ✅ Format nomor: `+62xxxxxxxxxx` (internasional)

### Error: "Failed to send WhatsApp message"
- ✅ Pastikan nomor sudah terdaftar di Twilio Sandbox
- ✅ Kirim pesan "join" ke nomor sandbox terlebih dahulu

### Pesan tidak sampai
- ✅ Cek status di Twilio Console
- ✅ Pastikan nomor aktif dan tidak diblokir WhatsApp
- ✅ Cek log di tabel `notification_logs`

## 💰 Cost & Limits

### Twilio WhatsApp Sandbox (Gratis)
- ✅ **0$** untuk development
- ✅ 10 pesan per jam
- ✅ Hanya untuk nomor yang terdaftar

### Twilio WhatsApp Production
- 💰 **$0.005**/pesan (incoming)
- 💰 **$0.041**/pesan (outgoing)
- ✅ Unlimited untuk nomor verified

## 📞 Support

Jika ada masalah:
1. Cek log di browser console
2. Cek log di Twilio Console
3. Cek tabel `notification_logs` di database
4. Test dengan halaman `test-whatsapp.html`

---

**🎉 Selamat! Sistem WhatsApp notifications Anda sudah siap digunakan!**

Untuk testing, buka halaman `test-whatsapp.html` dan mulai kirim pesan test ke nomor WhatsApp Anda.