# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/06-reservasi-member.spec.ts >> 06 - Reservasi Member >> B29: Buat reservasi durasi_jam < 1 atau bukan integer
- Location: tests/api/06-reservasi-member.spec.ts:136:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 201
```

# Test source

```ts
  63  |       headers: {
  64  |         Authorization: `Bearer ${memberA.token}`,
  65  |         'x-maker-key': makerKey,
  66  |       },
  67  |       data: {
  68  |         id_space: spaceId,
  69  |         tanggal_reservasi: '2026-11-10',
  70  |         jam_mulai: '08:00',
  71  |         durasi_jam: durasi,
  72  |       },
  73  |     });
  74  |     expect(response.status()).toBe(201);
  75  |     const body = await response.json();
  76  |     assertSuccessEnvelope(body, 201);
  77  | 
  78  |     const resData = body.data.reservasi || body.data;
  79  |     const detail = resData.detail_reservasi?.[0];
  80  |     const expectedTotal = hargaPerJam * durasi;
  81  | 
  82  |     if (detail) {
  83  |       expect(detail.total_harga).toBe(expectedTotal);
  84  |     }
  85  |   });
  86  | 
  87  |   test('B27: Buat reservasi dengan diskon/promo valid', async ({ request }) => {
  88  |     const durasi = 2;
  89  |     const response = await request.post('/api/reservasi', {
  90  |       headers: {
  91  |         Authorization: `Bearer ${memberA.token}`,
  92  |         'x-maker-key': makerKey,
  93  |       },
  94  |       data: {
  95  |         id_space: spaceId,
  96  |         tanggal_reservasi: '2026-11-10',
  97  |         jam_mulai: '14:00',
  98  |         durasi_jam: durasi,
  99  |         id_diskon: diskonId,
  100 |       },
  101 |     });
  102 |     expect(response.status()).toBe(201);
  103 |     const body = await response.json();
  104 |     assertSuccessEnvelope(body, 201);
  105 | 
  106 |     const resData = body.data.reservasi || body.data;
  107 |     const detail = resData.detail_reservasi?.[0];
  108 |     const totalAwal = hargaPerJam * durasi;
  109 |     const potongan = (totalAwal * diskonPersen) / 100;
  110 |     const expectedTotalBayar = totalAwal - potongan;
  111 | 
  112 |     if (detail) {
  113 |       expect(detail.total_harga).toBe(expectedTotalBayar);
  114 |     }
  115 |   });
  116 | 
  117 |   test('B28: Buat reservasi slot bentrok (overlap id_space + tanggal + jam)', async ({ request }) => {
  118 |     // 14:00 - 16:00 sudah dipesan di B27
  119 |     const response = await request.post('/api/reservasi', {
  120 |       headers: {
  121 |         Authorization: `Bearer ${memberB.token}`,
  122 |         'x-maker-key': makerKey,
  123 |       },
  124 |       data: {
  125 |         id_space: spaceId,
  126 |         tanggal_reservasi: '2026-11-10',
  127 |         jam_mulai: '15:00',
  128 |         durasi_jam: 2, // 15:00 - 17:00 -> bentrok dengan 14:00 - 16:00
  129 |       },
  130 |     });
  131 |     expect([400, 409]).toContain(response.status());
  132 |     const body = await response.json();
  133 |     assertErrorEnvelope(body, response.status());
  134 |   });
  135 | 
  136 |   test('B29: Buat reservasi durasi_jam < 1 atau bukan integer', async ({ request }) => {
  137 |     const resNegative = await request.post('/api/reservasi', {
  138 |       headers: {
  139 |         Authorization: `Bearer ${memberA.token}`,
  140 |         'x-maker-key': makerKey,
  141 |       },
  142 |       data: {
  143 |         id_space: spaceId,
  144 |         tanggal_reservasi: '2026-11-11',
  145 |         jam_mulai: '09:00',
  146 |         durasi_jam: 0,
  147 |       },
  148 |     });
  149 |     expect(resNegative.status()).toBe(400);
  150 | 
  151 |     const resFloat = await request.post('/api/reservasi', {
  152 |       headers: {
  153 |         Authorization: `Bearer ${memberA.token}`,
  154 |         'x-maker-key': makerKey,
  155 |       },
  156 |       data: {
  157 |         id_space: spaceId,
  158 |         tanggal_reservasi: '2026-11-11',
  159 |         jam_mulai: '09:00',
  160 |         durasi_jam: 1.5,
  161 |       },
  162 |     });
> 163 |     expect(resFloat.status()).toBe(400);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  164 |   });
  165 | 
  166 |   test('B30: jam_selesai terhitung otomatis dengan benar', async ({ request }) => {
  167 |     const response = await request.post('/api/reservasi', {
  168 |       headers: {
  169 |         Authorization: `Bearer ${memberA.token}`,
  170 |         'x-maker-key': makerKey,
  171 |       },
  172 |       data: {
  173 |         id_space: spaceId,
  174 |         tanggal_reservasi: '2026-11-12',
  175 |         jam_mulai: '09:30',
  176 |         durasi_jam: 3,
  177 |       },
  178 |     });
  179 |     expect(response.status()).toBe(201);
  180 |     const body = await response.json();
  181 |     const resData = body.data.reservasi || body.data;
  182 |     expect(resData.jam_selesai).toBe('12:30');
  183 |   });
  184 | 
  185 |   test('B31: GET /api/reservasi/my hanya menampilkan reservasi milik member login', async ({ request }) => {
  186 |     const response = await request.get('/api/reservasi/my', {
  187 |       headers: {
  188 |         Authorization: `Bearer ${memberA.token}`,
  189 |         'x-maker-key': makerKey,
  190 |       },
  191 |     });
  192 |     expect(response.status()).toBe(200);
  193 |     const body = await response.json();
  194 |     assertSuccessEnvelope(body, 200);
  195 | 
  196 |     const list = Array.isArray(body.data) ? body.data : body.data.reservasis || [];
  197 |     for (const r of list) {
  198 |       if (r.id_member) {
  199 |         expect(r.id_member).toBe(memberA.user.member?.id || memberA.user.id);
  200 |       }
  201 |     }
  202 |   });
  203 | 
  204 |   test('B32: GET /api/reservasi/my/history?month=&year=', async ({ request }) => {
  205 |     const response = await request.get('/api/reservasi/my/history?month=11&year=2026', {
  206 |       headers: {
  207 |         Authorization: `Bearer ${memberA.token}`,
  208 |         'x-maker-key': makerKey,
  209 |       },
  210 |     });
  211 |     expect(response.status()).toBe(200);
  212 |     const body = await response.json();
  213 |     assertSuccessEnvelope(body, 200);
  214 | 
  215 |     const summary = body.data.summary || body.data;
  216 |     expect(summary).toBeDefined();
  217 |     expect(typeof (summary.total_reservasi ?? summary.total)).toBe('number');
  218 |   });
  219 | 
  220 |   test('B33: GET /api/reservasi/{id}/e-ticket', async ({ request }) => {
  221 |     // Buat satu reservasi untuk tiket
  222 |     const createRes = await request.post('/api/reservasi', {
  223 |       headers: {
  224 |         Authorization: `Bearer ${memberA.token}`,
  225 |         'x-maker-key': makerKey,
  226 |       },
  227 |       data: {
  228 |         id_space: spaceId,
  229 |         tanggal_reservasi: '2026-11-15',
  230 |         jam_mulai: '13:00',
  231 |         durasi_jam: 2,
  232 |       },
  233 |     });
  234 |     const createBody = await createRes.json();
  235 |     const reservasiId = (createBody.data.reservasi || createBody.data).id;
  236 | 
  237 |     const response = await request.get(`/api/reservasi/${reservasiId}/e-ticket`, {
  238 |       headers: {
  239 |         Authorization: `Bearer ${memberA.token}`,
  240 |         'x-maker-key': makerKey,
  241 |       },
  242 |     });
  243 |     expect(response.status()).toBe(200);
  244 |     const body = await response.json();
  245 |     assertSuccessEnvelope(body, 200);
  246 | 
  247 |     const ticket = body.data.e_ticket || body.data;
  248 |     expect(ticket).toHaveProperty('qr_code_payload');
  249 |     expect(ticket.qr_code_payload).toContain(String(reservasiId));
  250 |     expect(ticket).toHaveProperty('kode_booking');
  251 |   });
  252 | 
  253 |   test('B34: PATCH /api/reservasi/{id}/cancel - Sukses lalu cancel lagi', async ({ request }) => {
  254 |     // Buat reservasi untuk dibatalkan
  255 |     const createRes = await request.post('/api/reservasi', {
  256 |       headers: {
  257 |         Authorization: `Bearer ${memberA.token}`,
  258 |         'x-maker-key': makerKey,
  259 |       },
  260 |       data: {
  261 |         id_space: spaceId,
  262 |         tanggal_reservasi: '2026-11-16',
  263 |         jam_mulai: '10:00',
```