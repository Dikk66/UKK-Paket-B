const prisma = require('../lib/prisma');

const sendResponse = (res, statusCode, message, data = null, error = null) => {
  const response = {
    status: statusCode < 400,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return res.status(statusCode).json(response);
};

/**
 * GET /api/admin/reports/monthly
 * Laporan reservasi bulanan
 */
const getMonthlyReport = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const { month, year } = req.query;

    if (!month || !year) {
      return sendResponse(res, 400, 'Parameter bulan dan tahun diperlukan', null,
        'Query parameter month dan year wajib diisi');
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const reservasis = await prisma.reservasi.findMany({
      where: {
        id_owner: user.spaceOwner.id,
        tanggal_reservasi: { gte: startDate, lte: endDate }
      },
      include: {
        member: { select: { nama_member: true } },
        detail_reservasi: {
          include: {
            space: { select: { nama_space: true, tipe: true } },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      },
      orderBy: { tanggal_reservasi: 'asc' }
    });

    // Statistik per status
    const statusStats = { belum_dikonfirm: 0, disetujui: 0, aktif: 0, selesai: 0, dibatalkan: 0 };
    reservasis.forEach(r => { statusStats[r.status]++; });

    // Statistik per space
    const spaceStats = {};
    reservasis.forEach(r => {
      r.detail_reservasi.forEach(d => {
        const key = d.id_space;
        if (!spaceStats[key]) {
          spaceStats[key] = {
            space_id: d.id_space,
            nama_space: d.space.nama_space,
            tipe: d.space.tipe,
            total_reservasi: 0,
            total_pendapatan: 0
          };
        }
        spaceStats[key].total_reservasi++;
        if (r.status !== 'dibatalkan') {
          spaceStats[key].total_pendapatan += d.total_harga;
        }
      });
    });

    // Total pendapatan selesai
    const totalPendapatan = reservasis
      .filter(r => r.status === 'selesai')
      .reduce((sum, r) => sum + r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0), 0);

    // Reservasi per hari
    const dailyStats = {};
    reservasis.forEach(r => {
      const dayKey = r.tanggal_reservasi.toISOString().split('T')[0];
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = { tanggal: dayKey, total_reservasi: 0, total_bayar: 0 };
      }
      dailyStats[dayKey].total_reservasi++;
      if (r.status !== 'dibatalkan') {
        dailyStats[dayKey].total_bayar += r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0);
      }
    });

    return sendResponse(res, 200, 'Laporan bulanan berhasil diambil', {
      periode: {
        bulan: monthNum,
        tahun: yearNum,
        nama_bulan: startDate.toLocaleString('id-ID', { month: 'long' }),
        start_date: startDate,
        end_date: endDate
      },
      summary: {
        total_reservasi: reservasis.length,
        total_pendapatan_selesai: totalPendapatan,
        by_status: statusStats
      },
      by_space: Object.values(spaceStats),
      daily_stats: Object.values(dailyStats).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
      reservasis
    });
  } catch (error) {
    console.error('Admin monthly report error:', error);
    return sendResponse(res, 500, 'Gagal mengambil laporan bulanan', null, error.message);
  }
};

/**
 * GET /api/admin/reports/income
 * Laporan pendapatan bulanan
 */
const getIncomeReport = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const { month, year } = req.query;

    if (!month || !year) {
      return sendResponse(res, 400, 'Parameter bulan dan tahun diperlukan', null,
        'Query parameter month dan year wajib diisi');
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Hanya reservasi selesai
    const completedReservasis = await prisma.reservasi.findMany({
      where: {
        id_owner: user.spaceOwner.id,
        tanggal_reservasi: { gte: startDate, lte: endDate },
        status: 'selesai'
      },
      include: {
        detail_reservasi: {
          include: {
            space: { select: { nama_space: true, tipe: true, harga_per_jam: true } },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      },
      orderBy: { tanggal_reservasi: 'asc' }
    });

    const totalPendapatan = completedReservasis.reduce(
      (sum, r) => sum + r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0), 0
    );

    // Per space
    const bySpace = {};
    completedReservasis.forEach(r => {
      r.detail_reservasi.forEach(d => {
        const key = d.id_space;
        if (!bySpace[key]) {
          bySpace[key] = {
            space_id: d.id_space,
            nama_space: d.space.nama_space,
            tipe: d.space.tipe,
            total_reservasi: 0,
            total_durasi_jam: 0,
            total_pendapatan: 0
          };
        }
        bySpace[key].total_reservasi++;
        bySpace[key].total_durasi_jam += r.durasi_jam;
        bySpace[key].total_pendapatan += d.total_harga;
      });
    });

    // Per hari
    const byDay = {};
    completedReservasis.forEach(r => {
      const dayKey = r.tanggal_reservasi.toISOString().split('T')[0];
      if (!byDay[dayKey]) {
        byDay[dayKey] = { tanggal: dayKey, total_reservasi: 0, total_pendapatan: 0 };
      }
      byDay[dayKey].total_reservasi++;
      byDay[dayKey].total_pendapatan += r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0);
    });

    // Bulan sebelumnya
    const prevMonthStart = new Date(yearNum, monthNum - 2, 1);
    const prevMonthEnd = new Date(yearNum, monthNum - 1, 0, 23, 59, 59);

    const prevReservasis = await prisma.reservasi.findMany({
      where: {
        id_owner: user.spaceOwner.id,
        tanggal_reservasi: { gte: prevMonthStart, lte: prevMonthEnd },
        status: 'selesai'
      },
      include: { detail_reservasi: { select: { total_harga: true } } }
    });

    const prevPendapatan = prevReservasis.reduce(
      (sum, r) => sum + r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0), 0
    );

    const pertumbuhan = prevPendapatan > 0
      ? parseFloat(((totalPendapatan - prevPendapatan) / prevPendapatan * 100).toFixed(2))
      : null;

    return sendResponse(res, 200, 'Laporan pendapatan berhasil diambil', {
      periode: {
        bulan: monthNum,
        tahun: yearNum,
        nama_bulan: startDate.toLocaleString('id-ID', { month: 'long' }),
        start_date: startDate,
        end_date: endDate
      },
      summary: {
        total_transaksi: completedReservasis.length,
        total_pendapatan: totalPendapatan,
        rata_rata_per_transaksi: completedReservasis.length > 0
          ? totalPendapatan / completedReservasis.length : 0
      },
      perbandingan: {
        bulan_sebelumnya: prevPendapatan,
        pertumbuhan_persen: pertumbuhan
      },
      by_space: Object.values(bySpace),
      by_day: Object.values(byDay).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
      transaksi: completedReservasis
    });
  } catch (error) {
    console.error('Admin income report error:', error);
    return sendResponse(res, 500, 'Gagal mengambil laporan pendapatan', null, error.message);
  }
};

module.exports = { getMonthlyReport, getIncomeReport };
