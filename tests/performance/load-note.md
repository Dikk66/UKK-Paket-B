# Catatan Pengujian Beban & Konkurensi (Load & Concurrency Testing)

## 1. Limitasi Playwright `request` Context
Playwright dirancang sebagai end-to-end and integration test framework. Meskipun fixture `request` sangat baik untuk fungsional, kontrak, dan pengujian keamanan API, Playwright **tidak dirancang** untuk:
- Mengirim ratusan atau ribuan request simultan per detik (RPS).
- Mengukur latency percentiles (p95, p99) di bawah kondisi beban ekstrim.
- Mensimulasikan ribuan Virtual Users (VUs) dengan pemakaian memori yang efisien.

Oleh karena itu, pengujian beban sungguhan direkomendasikan menggunakan tools berdedikasi seperti **k6** atau **Artillery**.

---

## 2. Risiko Race Condition: Double-Booking pada Reservasi
Dalam sistem reservasi coworking space, celah konkurensi paling kritis adalah **Time-of-Check to Time-of-Use (TOCTOU)**:
1. User A dan User B secara bersamaan mengirim request reservasi untuk `id_space` yang sama pada jam dan tanggal yang sama.
2. Server menjalankan query pengecekan availability (check overlap) untuk kedua user secara bersamaan.
3. Keduanya mendapati bahwa slot masih kosong (`conflicting.length === 0`).
4. Server melakukan `prisma.reservasi.create` untuk kedua request.
5. **Akibat**: Terjadi *double-booking* pada ruang dan jam yang identik, melanggar aturan bisnis utama!

### Rekomendasi Solusi Teknis
Untuk mencegah race condition ini di level backend:
1. **Database Transaction + Locking**: Gunakan transaksi dengan isolation level `SERIALIZABLE` atau `SELECT ... FOR UPDATE` (pessimistic lock) pada baris space/slot yang sedang diperiksa.
2. **Unique Composite Constraint**: Buat tabel slot booking spesifik dengan kombinasi `UNIQUE(id_space, tanggal_reservasi, jam_slot)`.
3. **Distributed Lock**: Gunakan Redis lock (`Redlock`) berdasarkan key `lock:space:{id_space}:{tanggal}:{jam}` selama proses reservasi berlangsung.

---

## 3. Contoh Skrip Pengujian Beban Menggunakan k6

Simpan skrip berikut sebagai `load-test.js` dan jalankan menggunakan `k6 run load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up ke 20 VUs
    { duration: '1m', target: 50 },   // Beban stabil di 50 VUs
    { duration: '30s', target: 100 },  // Spike test ke 100 VUs (uji konkurensi)
    { duration: '20s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% request harus di bawah 1000ms
    http_req_failed: ['rate<0.05'],    // Tingkat kegagalan di bawah 5%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const MAKER_KEY = __ENV.MAKER_KEY || 'mk_sample_key_here';
const MEMBER_TOKEN = __ENV.MEMBER_TOKEN || 'sample_token_here';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-maker-key': MAKER_KEY,
  };

  // 1. Uji GET /api/spaces (Katalog)
  const catalogRes = http.get(`${BASE_URL}/api/spaces`, { headers });
  check(catalogRes, {
    'catalog status 200': (r) => r.status === 200,
    'catalog latency < 500ms': (r) => r.timings.duration < 500,
  });

  // 2. Uji Konkurensi POST /api/reservasi (Simulasi Rebutan Slot)
  const reservationPayload = JSON.stringify({
    id_space: 1,
    tanggal_reservasi: '2026-12-25',
    jam_mulai: '10:00',
    durasi_jam: 2,
  });

  const reservationHeaders = {
    ...headers,
    Authorization: `Bearer ${MEMBER_TOKEN}`,
  };

  const resBooking = http.post(`${BASE_URL}/api/reservasi`, reservationPayload, {
    headers: reservationHeaders,
  });

  // Dalam kondisi konkurensi tinggi, tepat 1 user yang mendapat 201, sisanya harus mendapat 400 atau 409
  check(resBooking, {
    'booking status valid (201 or 409/400)': (r) => [201, 400, 409].includes(r.status),
  });

  sleep(1);
}
```
