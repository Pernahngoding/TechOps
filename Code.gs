/**
 * =========================================================================
 * TEACHOPS (TEACHING OPERATIONS) - GOOGLE APPS SCRIPT (Code.gs)
 * Backend & Database Engine MTs SAHID
 * =========================================================================
 * 
 * STRUKTUR SHEETS DATABASE:
 * 1. Users       : PegID, Nama, Role, Jabatan, Pass
 * 2. Sekolah     : Key, Value
 * 3. Kelas       : IDKelas, NamaKelas, Tingkat, WaliKelas (fleksibel posisi kolom)
 * 4. Mapel       : IDMapel, NamaMapel, Kategori
 * 5. JadwalMapel : Hari, Sesi, Jam, Kelas, Mapel, PegIDGuru
 * 6. JadwalPiket : Hari, Sesi, PegID (kompatibel PegIDGuru)
 * 7. IzinTugas   : ID, Tanggal, PegIDGuru, Kelas, Sesi, Mapel, Alasan, DeskripsiTugas, Status, ClaimedByPegID, BuktiInval, FotoDriveUrl
 */

const SHEET_USERS = 'Users';
const SHEET_SEKOLAH = 'Sekolah';
const SHEET_KELAS = 'Kelas';
const SHEET_MAPEL = 'Mapel';
const SHEET_JADWAL_MAPEL = 'JadwalMapel';
const SHEET_JADWAL_PIKET = 'JadwalPiket';
const SHEET_IZIN_TUGAS = 'IzinTugas';

// Folder Google Drive untuk Bukti Inval (Maksimal 300KB)
const DRIVE_FOLDER_ID = '1Q0BmAwRkSzC-qjKbg4Gtxx0NTLmbRKdd';

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    let result = {};

    switch (action) {
      case 'ping':
        result = {
          success: true,
          message: 'TeachOps MTs SAHID Google Apps Script Backend aktif!',
          timestamp: new Date().toISOString()
        };
        break;

      case 'init':
        setupDatabase();
        result = { success: true, message: 'Database header berhasil diverifikasi!' };
        break;

      case 'getAllData':
        result = handleGetAllData();
        break;

      case 'getDashboard':
        result = handleGetDashboard(e.parameter.pegid, e.parameter.hari);
        break;

      default:
        result = { success: false, message: 'Action GET tidak dikenali: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }

    const action = postData.action || '';
    let result = {};

    switch (action) {
      case 'login':
        result = handleLogin(postData.pegid, postData.password);
        break;

      case 'registerFirstAdmin':
        result = handleRegisterFirstAdmin(postData);
        break;

      case 'addIzin':
        result = handleAddIzin(postData);
        break;

      case 'claimTugas':
        result = handleClaimTugas(postData.id, postData.claimedByPegID);
        break;

      case 'submitBuktiInval':
        result = handleSubmitBuktiInval(postData);
        break;

      case 'saveJadwalMapel':
        result = handleSaveJadwalMapel(postData.jadwal);
        break;

      case 'deleteJadwalMapel':
        result = handleDeleteRow(SHEET_JADWAL_MAPEL, postData.index);
        break;

      case 'saveJadwalPiket':
        result = handleSaveJadwalPiket(postData.jadwal);
        break;

      case 'deleteJadwalPiket':
        result = handleDeleteRow(SHEET_JADWAL_PIKET, postData.index);
        break;

      case 'saveUser':
        result = handleSaveUser(postData.user);
        break;

      case 'deleteUser':
        result = handleDeleteUser(postData.pegid);
        break;

      case 'saveKelas':
        result = handleSaveKelas(postData.kelas);
        break;

      case 'deleteKelas':
        result = handleDeleteRow(SHEET_KELAS, postData.index);
        break;

      case 'saveMapel':
        result = handleSaveMapel(postData.mapel);
        break;

      case 'deleteMapel':
        result = handleDeleteRow(SHEET_MAPEL, postData.index);
        break;

      case 'saveSekolah':
        result = handleSaveSekolah(postData.sekolah);
        break;

      default:
        result = { success: false, message: 'Action POST tidak dikenali: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Inisialisasi Database Bersih untuk MTs SAHID
 */
function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Sheet Users
  let sUsers = ss.getSheetByName(SHEET_USERS);
  if (!sUsers) {
    sUsers = ss.insertSheet(SHEET_USERS);
    sUsers.appendRow(['PegID', 'Nama', 'Role', 'Jabatan', 'Pass']);
    sUsers.appendRow(['123456', 'Muhamad Yunus', 'superadmin', 'Super Admin', 'yunus1*']);
    sUsers.appendRow(['121232010131', 'MTs SAHID', 'admin', 'admin', 'admin123']);
    sUsers.appendRow(['7654321', 'Ahmad Fulan', 'guru', 'Aqidah Akhlak', 'fulan1']);
  }

  // 2. Sheet Sekolah
  let sSekolah = ss.getSheetByName(SHEET_SEKOLAH);
  if (!sSekolah) {
    sSekolah = ss.insertSheet(SHEET_SEKOLAH);
    sSekolah.appendRow(['Key', 'Value']);
    sSekolah.appendRow(['NamaSekolah', 'MTs SAHID']);
    sSekolah.appendRow(['NPSN', '20277594']);
    sSekolah.appendRow(['Semester', 'Ganjil 2026/2027']);
    sSekolah.appendRow(['KepalaSekolah', 'R. Jaja Jumhana, S.Pd']);
    sSekolah.appendRow(['Alamat', 'Jl. Kh Abdul Hamid Km 6']);
    sSekolah.appendRow(['SIPSarprasUrl', 'https://sipsarpras.pernahngoding.my.id/']);
  }

  // 3. Sheet Kelas
  let sKelas = ss.getSheetByName(SHEET_KELAS);
  if (!sKelas) {
    sKelas = ss.insertSheet(SHEET_KELAS);
    sKelas.appendRow(['IDKelas', 'NamaKelas', 'Tingkat', 'WaliKelas']);
  }

  // 4. Sheet Mapel
  let sMapel = ss.getSheetByName(SHEET_MAPEL);
  if (!sMapel) {
    sMapel = ss.insertSheet(SHEET_MAPEL);
    sMapel.appendRow(['IDMapel', 'NamaMapel', 'Kategori']);
  }

  // 5. Sheet JadwalMapel
  let sJadwal = ss.getSheetByName(SHEET_JADWAL_MAPEL);
  if (!sJadwal) {
    sJadwal = ss.insertSheet(SHEET_JADWAL_MAPEL);
    sJadwal.appendRow(['Hari', 'Sesi', 'Jam', 'Kelas', 'Mapel', 'PegIDGuru']);
  }

  // 6. Sheet JadwalPiket
  let sPiket = ss.getSheetByName(SHEET_JADWAL_PIKET);
  if (!sPiket) {
    sPiket = ss.insertSheet(SHEET_JADWAL_PIKET);
    sPiket.appendRow(['Hari', 'Sesi', 'PegID']);
  }

  // 7. Sheet IzinTugas
  let sIzin = ss.getSheetByName(SHEET_IZIN_TUGAS);
  if (!sIzin) {
    sIzin = ss.insertSheet(SHEET_IZIN_TUGAS);
    sIzin.appendRow(['ID', 'Tanggal', 'PegIDGuru', 'Kelas', 'Sesi', 'Mapel', 'Alasan', 'DeskripsiTugas', 'Status', 'ClaimedByPegID', 'BuktiInval', 'FotoDriveUrl']);
  } else if (sIzin.getLastColumn() > 0) {
    // Koreksi otomatis jika header bertuliskan 'Alasa' menjadi 'Alasan'
    const headers = sIzin.getRange(1, 1, 1, sIzin.getLastColumn()).getValues()[0];
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c]).trim().toLowerCase() === 'alasa') {
        sIzin.getRange(1, c + 1).setValue('Alasan');
      }
    }
  }
}

/**
 * Mengambil Seluruh Master Data Langsung dari Sheet
 */
function handleGetAllData() {
  setupDatabase();
  const rawUsers = getAllSheetData(SHEET_USERS);
  const safeUsers = rawUsers.map(u => ({
    PegID: String(u.PegID || '').trim(),
    Nama: u.Nama || '',
    Role: String(u.Role || 'guru').toLowerCase().trim(),
    Jabatan: u.Jabatan || ''
  }));

  const sekolahList = getAllSheetData(SHEET_SEKOLAH);
  const sekolahObj = {};
  sekolahList.forEach(item => {
    if (item.Key) sekolahObj[item.Key] = item.Value;
  });

  return {
    success: true,
    sekolah: sekolahObj,
    users: safeUsers,
    totalUsersCount: rawUsers.length,
    kelas: getAllSheetData(SHEET_KELAS),
    mapel: getAllSheetData(SHEET_MAPEL),
    jadwalMapel: getAllSheetData(SHEET_JADWAL_MAPEL),
    jadwalPiket: getAllSheetData(SHEET_JADWAL_PIKET),
    izinTugas: getAllSheetData(SHEET_IZIN_TUGAS)
  };
}

/**
 * Autentikasi Login berdasarkan PegID dan Password
 */
function handleLogin(pegid, password) {
  setupDatabase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      success: false,
      isEmptyDatabase: true,
      message: 'Sheet Users masih kosong.'
    };
  }

  const headers = values[0];
  const pegidCol = headers.indexOf('PegID');
  const passCol = headers.indexOf('Pass');
  const namaCol = headers.indexOf('Nama');
  const roleCol = headers.indexOf('Role');
  const jabatanCol = headers.indexOf('Jabatan');

  const cleanPegid = String(pegid || '').toUpperCase().trim();
  const cleanPass = String(password || '').trim();

  for (let i = 1; i < values.length; i++) {
    const rowPegid = String(values[i][pegidCol]).toUpperCase().trim();
    const rowPass = String(values[i][passCol]).trim();

    if (rowPegid === cleanPegid && rowPass === cleanPass) {
      return {
        success: true,
        user: {
          PegID: rowPegid,
          Nama: values[i][namaCol],
          Role: String(values[i][roleCol] || 'guru').toLowerCase().trim(),
          Jabatan: values[i][jabatanCol] || 'Guru'
        }
      };
    }
  }

  return {
    success: false,
    message: 'PegID atau Password tidak cocok dengan database MTs SAHID.'
  };
}

/**
 * Registrasi Akun Superadmin Pertama Jika Sheet Masih Kosong
 */
function handleRegisterFirstAdmin(data) {
  setupDatabase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const values = sheet.getDataRange().getValues();

  if (values.length > 1) {
    return { success: false, message: 'Database Users sudah terisi.' };
  }

  const pegid = (data.pegid || '123456').trim();
  const nama = data.nama || 'Muhamad Yunus';
  const role = 'superadmin';
  const jabatan = data.jabatan || 'Super Admin';
  const pass = data.pass || 'yunus1*';

  sheet.appendRow([pegid, nama, role, jabatan, pass]);

  return {
    success: true,
    message: 'Akun Superadmin berhasil didaftarkan!',
    user: { PegID: pegid, Nama: nama, Role: role, Jabatan: jabatan }
  };
}

/**
 * Ambil Dashboard & Notifikasi Sesi Real-Time
 */
function handleGetDashboard(pegid, hari) {
  setupDatabase();
  const cleanPegid = String(pegid || '').toUpperCase().trim();
  const rawJadwal = getAllSheetData(SHEET_JADWAL_MAPEL);
  const rawPiket = getAllSheetData(SHEET_JADWAL_PIKET);
  const rawIzin = getAllSheetData(SHEET_IZIN_TUGAS);

  const jadwalSayaHariIni = rawJadwal.filter(j => 
    String(j.PegIDGuru || j.PegID || '').toUpperCase().trim() === cleanPegid &&
    (!hari || String(j.Hari).toLowerCase() === String(hari).toLowerCase())
  );

  const isPiketHariIni = rawPiket.some(p => 
    String(p.PegID || p.PegIDGuru || '').toUpperCase().trim() === cleanPegid &&
    (!hari || String(p.Hari).toLowerCase() === String(hari).toLowerCase())
  );

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const izinHariIni = rawIzin.filter(i => String(i.Tanggal) === todayStr);

  return {
    success: true,
    jadwalSayaHariIni,
    isPiketHariIni,
    izinHariIni,
    totalIzinPending: izinHariIni.filter(i => i.Status === 'Pending').length
  };
}

/**
 * Input Izin / Sakit & Penugasan Siswa
 */
function handleAddIzin(data) {
  setupDatabase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_IZIN_TUGAS);

  const id = 'IZN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + Math.floor(100 + Math.random() * 900);
  const tanggal = data.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    id,
    tanggal,
    (data.pegidGuru || '').toUpperCase().trim(),
    data.kelas || '',
    data.sesi || '',
    data.mapel || '',
    data.alasan || 'Izin',
    data.deskripsiTugas || '',
    'Pending',
    '',
    '',
    ''
  ]);

  return { success: true, message: 'Izin berhasil disimpan ke sheet IzinTugas.', id };
}

/**
 * Klaim Tugas Inval oleh Guru Piket
 */
function handleClaimTugas(id, claimedByPegID) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_IZIN_TUGAS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ID');
  const statusCol = headers.indexOf('Status');
  const claimedCol = headers.indexOf('ClaimedByPegID');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      if (values[i][statusCol] !== 'Pending') {
        return { success: false, message: 'Tugas ini sudah diklaim atau selesai.' };
      }
      sheet.getRange(i + 1, statusCol + 1).setValue('Diklaim');
      sheet.getRange(i + 1, claimedCol + 1).setValue(claimedByPegID);
      return { success: true, message: 'Kelas berhasil diklaim!' };
    }
  }
  return { success: false, message: 'ID izin tidak ditemukan.' };
}

/**
 * Submit Bukti Inval & Upload Foto ke Google Drive
 */
function handleSubmitBuktiInval(postData) {
  setupDatabase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_IZIN_TUGAS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ID');
  const statusCol = headers.indexOf('Status');
  const buktiCol = headers.indexOf('BuktiInval');
  let fotoCol = headers.indexOf('FotoDriveUrl');
  if (fotoCol === -1) {
    fotoCol = headers.length;
    sheet.getRange(1, fotoCol + 1).setValue('FotoDriveUrl');
  }

  const id = postData.id;
  const catatan = postData.catatan || postData.buktiInval || 'Telah dilaksanakan';
  let driveFileUrl = '';

  if (postData.fileBase64) {
    try {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const cleanBase64 = String(postData.fileBase64).replace(/^data:image\/[a-z]+;base64,/, '');
      const decodedBytes = Utilities.base64Decode(cleanBase64);
      const fileName = postData.fileName || ('Inval_' + id + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.jpg');
      const blob = Utilities.newBlob(decodedBytes, postData.mimeType || 'image/jpeg', fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileUrl = file.getUrl();
    } catch (driveErr) {
      Logger.log('Drive Error: ' + driveErr.toString());
      driveFileUrl = 'Err: ' + driveErr.toString();
    }
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, statusCol + 1).setValue('Selesai');
      sheet.getRange(i + 1, buktiCol + 1).setValue(catatan);
      if (driveFileUrl) {
        sheet.getRange(i + 1, fotoCol + 1).setValue(driveFileUrl);
      }
      return { 
        success: true, 
        message: 'Bukti pelaksanaan inval tersimpan' + (driveFileUrl && !driveFileUrl.startsWith('Err') ? ' dan foto berhasil diunggah ke Google Drive!' : '!'),
        driveFileUrl: driveFileUrl
      };
    }
  }
  return { success: false, message: 'ID izin tidak ditemukan.' };
}

/**
 * CRUD Master Data dengan Ekstraksi Fleksibel
 */
function handleSaveJadwalMapel(j) {
  if (typeof j === 'string') {
    try { j = JSON.parse(j); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_JADWAL_MAPEL);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_JADWAL_MAPEL); }
  
  sheet.appendRow([
    j.Hari || 'Senin',
    j.Sesi || 'Sesi 1',
    j.Jam || '07.30 - 08.30',
    j.Kelas || '-',
    j.Mapel || '-',
    String(j.PegIDGuru || j.PegID || '').toUpperCase().trim()
  ]);
  return { success: true, message: 'Sesi jadwal baru disimpan ke database!' };
}

function handleSaveJadwalPiket(p) {
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_JADWAL_PIKET);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_JADWAL_PIKET); }
  
  const hari = p.Hari || 'Senin';
  const sesi = p.Sesi || 'Semua Sesi';
  const pegid = String(p.PegID || p.PegIDGuru || '').toUpperCase().trim();

  sheet.appendRow([hari, sesi, pegid]);
  return { success: true, message: 'Petugas piket disimpan ke database!' };
}

function handleSaveUser(u) {
  if (typeof u === 'string') {
    try { u = JSON.parse(u); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_USERS); }

  const pegid = String(u.PegID || u.pegid || '').toUpperCase().trim();
  const nama = u.Nama || u.nama || 'Pengguna Baru';
  const role = String(u.Role || u.role || 'guru').toLowerCase().trim();
  const jabatan = u.Jabatan || u.jabatan || 'Guru';
  const pass = u.Pass || u.pass || '123456';

  sheet.appendRow([pegid, nama, role, jabatan, pass]);
  return { success: true, message: 'Pegawai/Guru ' + nama + ' (' + pegid + ') disimpan ke database!' };
}

function handleDeleteUser(pegid) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).toUpperCase().trim() === String(pegid).toUpperCase().trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Pengguna ' + pegid + ' berhasil dihapus.' };
    }
  }
  return { success: false, message: 'PegID tidak ditemukan.' };
}

/**
 * Handle Save Kelas - Cerdas Menemukan Posisi Kolom (baik di Kolom A maupun Kolom L/M/N/O)
 */
function handleSaveKelas(k) {
  if (typeof k === 'string') {
    try { k = JSON.parse(k); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_KELAS);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_KELAS); }

  const idKelas = (k.IDKelas || k.idKelas || ('KLS-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'mmss'))).toString();
  const namaKelas = (k.NamaKelas || k.namaKelas || k.Nama || k.nama || '').toString().trim();
  const tingkat = (k.Tingkat || k.tingkat || 'Kelas 7').toString().trim();
  const wali = (k.WaliKelas || k.waliKelas || k.Wali || k.wali || '-').toString().trim();

  // Cari di baris header letak kolom IDKelas, NamaKelas, Tingkat, WaliKelas
  const values = sheet.getDataRange().getValues();
  let idCol = 1, namaCol = 2, tingkatCol = 3, waliCol = 4;
  let customHeadersFound = false;

  if (values.length > 0) {
    const r0 = values[0];
    for (let c = 0; c < r0.length; c++) {
      const h = String(r0[c]).toLowerCase().replace(/[^a-z]/g, '');
      if (h.includes('idkelas')) { idCol = c + 1; customHeadersFound = true; }
      else if (h.includes('namakelas') || h === 'kelas') { namaCol = c + 1; customHeadersFound = true; }
      else if (h.includes('tingkat')) { tingkatCol = c + 1; customHeadersFound = true; }
      else if (h.includes('walikelas') || h.includes('wali')) { waliCol = c + 1; customHeadersFound = true; }
    }
  }

  // Tulis ke baris berikutnya di posisi kolom yang sesuai
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, idCol).setValue(idKelas);
  sheet.getRange(nextRow, namaCol).setValue(namaKelas);
  sheet.getRange(nextRow, tingkatCol).setValue(tingkat);
  sheet.getRange(nextRow, waliCol).setValue(wali);

  // Jika kolom header sebelumnya berada jauh di kanan (misal kolom L), pastikan kolom A-D juga terisi agar sinkronisasi selalu sukses
  if (idCol > 1) {
    sheet.getRange(nextRow, 1, 1, 4).setValues([[idKelas, namaKelas, tingkat, wali]]);
    if (!sheet.getRange(1, 1).getValue()) {
      sheet.getRange(1, 1, 1, 4).setValues([['IDKelas', 'NamaKelas', 'Tingkat', 'WaliKelas']]);
    }
  }

  return { 
    success: true, 
    message: 'Kelas ' + namaKelas + ' berhasil disimpan ke Sheet Kelas!',
    kelas: { IDKelas: idKelas, NamaKelas: namaKelas, Tingkat: tingkat, WaliKelas: wali }
  };
}

function handleSaveMapel(m) {
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_MAPEL);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_MAPEL); }

  const idMapel = (m.IDMapel || m.idMapel || ('MP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'mmss'))).toString();
  const namaMapel = (m.NamaMapel || m.namaMapel || m.Nama || m.nama || '').toString().trim();
  const kategori = (m.Kategori || m.kategori || 'Umum').toString().trim();

  sheet.appendRow([idMapel, namaMapel, kategori]);
  return { success: true, message: 'Mata pelajaran ' + namaMapel + ' disimpan ke sheet Mapel!' };
}

function handleSaveSekolah(data) {
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch(e) {}
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SEKOLAH);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(SHEET_SEKOLAH); }
  sheet.clearContents();
  sheet.appendRow(['Key', 'Value']);
  Object.keys(data).forEach(k => {
    sheet.appendRow([k, data[k]]);
  });
  return { success: true, message: 'Data profil sekolah disimpan ke database!' };
}

function handleDeleteRow(sheetName, index) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const row = Number(index) + 2; // +1 header, +1 1-based index
  if (row <= sheet.getLastRow() && row > 1) {
    sheet.deleteRow(row);
    return { success: true, message: 'Baris berhasil dihapus dari sheet ' + sheetName + '.' };
  }
  return { success: false, message: 'Indeks baris tidak valid.' };
}

/**
 * Membaca data sheet dengan normalisasi header & data fleksibel
 */
function getAllSheetData(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(sheetName); }
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const hasData = row.some(cell => String(cell).trim() !== '');
    if (!hasData) continue;

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      const h = String(headers[j]).trim();
      if (h) {
        rowObj[h] = row[j];
      }
    }

    // Normalisasi khusus JadwalPiket: cocokkan PegID dan PegIDGuru
    if (sheetName === SHEET_JADWAL_PIKET) {
      const pegidVal = String(rowObj.PegID || rowObj.PegIDGuru || rowObj.pegid || '').trim();
      rowObj.PegID = pegidVal;
      rowObj.PegIDGuru = pegidVal;
      if (!rowObj.Sesi) {
        rowObj.Sesi = rowObj['Sesi Piket'] || 'Semua Sesi';
      }
    }

    // Normalisasi khusus Kelas: ambil nilai jika header di kolom jauh (seperti Kolom L/M/N/O)
    if (sheetName === SHEET_KELAS) {
      if (!rowObj.NamaKelas && !rowObj.namaKelas && !rowObj.Kelas) {
        // Ambil dari cell yang tidak kosong
        const nonEmpty = [];
        for (let c = 0; c < row.length; c++) {
          if (String(row[c]).trim() !== '') nonEmpty.push(row[c]);
        }
        if (nonEmpty.length >= 2) {
          rowObj.IDKelas = nonEmpty[0];
          rowObj.NamaKelas = nonEmpty[1];
          rowObj.Tingkat = nonEmpty[2] || '';
          rowObj.WaliKelas = nonEmpty[3] || '-';
        }
      }
    // Normalisasi khusus IzinTugas: perbaiki typo header 'Alasa' dan format Tanggal bersih
    if (sheetName === SHEET_IZIN_TUGAS) {
      const alasanVal = rowObj.Alasan || rowObj.Alasa || rowObj.alasan || rowObj.alasa || 'Izin';
      rowObj.Alasan = alasanVal;
      rowObj.Alasa = alasanVal;

      // Normalisasi format Tanggal ke YYYY-MM-DD (WIB / Asia/Jakarta)
      if (rowObj.Tanggal instanceof Date) {
        rowObj.Tanggal = Utilities.formatDate(rowObj.Tanggal, 'Asia/Jakarta', 'yyyy-MM-dd');
      } else if (typeof rowObj.Tanggal === 'string' && rowObj.Tanggal.includes('T')) {
        try {
          const d = new Date(rowObj.Tanggal);
          if (!isNaN(d.getTime())) {
            rowObj.Tanggal = Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
          }
        } catch (e) {}
      }
    }

    rows.push(rowObj);
  }

  return rows;
}
