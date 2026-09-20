/**
 * Test Data Generator Helpers
 * Memberikan data unik dengan timestamp & random suffix agar tidak bentrok
 */

export function uniqueId(prefix = 't'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

export function generateMakerPayload(overrides = {}) {
  const id = uniqueId('mkr');
  return {
    name: `Maker ${id}`,
    username: `user_${id}`,
    email: `${id}@ukk-test.local`,
    password: 'MakerPassword123!',
    ...overrides,
  };
}

export function generateMemberPayload(overrides = {}) {
  const id = uniqueId('mbr');
  return {
    username: `mem_${id}`,
    password: 'MemberPass123!',
    nama_member: `Member Test ${id}`,
    instansi: 'SMK Telkom Malang',
    alamat: 'Jl. Danau Ranau No. 1 Malang',
    telp: '081234567890',
    ...overrides,
  };
}

export function generateAdminPayload(overrides = {}) {
  const id = uniqueId('adm');
  return {
    username: `adm_${id}`,
    password: 'AdminPass123!',
    nama_coworking: `Coworking Space ${id}`,
    nama_pemilik: `Owner ${id}`,
    telp: '081987654321',
    alamat: 'Jl. Soekarno Hatta No. 99 Malang',
    ...overrides,
  };
}

export function generateSpacePayload(overrides = {}) {
  const id = uniqueId('spc');
  return {
    nama_space: `Ruang Kerja ${id}`,
    harga_per_jam: 25000,
    kapasitas: 4,
    tipe: 'desk', // 'desk' | 'meeting_room' | 'private_office'
    deskripsi: `Deskripsi lengkap untuk ruang ${id}`,
    ...overrides,
  };
}

export function generateDiskonPayload(overrides = {}) {
  const id = uniqueId('dsk');
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    nama_diskon: `PROMO_${id.toUpperCase()}`,
    persentase_diskon: 15,
    tanggal_awal: fmt(now),
    tanggal_akhir: fmt(future),
    ...overrides,
  };
}
