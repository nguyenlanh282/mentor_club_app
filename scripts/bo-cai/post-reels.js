#!/usr/bin/env node
/*
 * post-reels.js — Đăng video Reel từ Lark Base lên Facebook Page.
 *
 * Luồng: Lark Base (TT Reel = "Chờ đăng") -> tải video về máy -> Facebook
 *        Graph API (upload phân mảnh Reels) -> ghi ngược Base (Đã đăng + link).
 *
 * KHÔNG đi qua Anycross => không dính trần dung lượng video.
 *
 * Cấu hình: sửa config.local.json (FB_PAGE_ID, FB_PAGE_TOKEN).
 * Chạy:     node post-reels.js            (đăng thật)
 *           node post-reels.js --dry-run  (chỉ in ra, không đăng, không ghi Base)
 */

'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// ---------- Cấu hình ----------
const ROOT = __dirname;
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.local.json'), 'utf8'));
const BASE_TOKEN = CFG.BASE_TOKEN;
const TABLE_ID   = CFG.TABLE_ID;
const PAGE_ID    = CFG.FB_PAGE_ID;
const TOKEN      = CFG.FB_PAGE_TOKEN;
const GVER       = CFG.GRAPH_VERSION || 'v21.0';
const TRIGGER    = CFG.TRIGGER || 'Chờ đăng';
// true = chỉ đăng khi đã tới giờ trong field "Lịch đăng"; dòng chưa tới giờ thì để lại.
// Dòng "Chờ đăng" mà KHÔNG điền Lịch đăng -> đăng ngay.
const RESPECT_SCHEDULE = CFG.RESPECT_SCHEDULE !== false;
// Số lần thử tối đa cho lỗi TẠM THỜI (mạng/timeout/FB 5xx). Lỗi VĨNH VIỄN không thử lại.
const MAX_RETRY = CFG.MAX_RETRY || 3;
const GRAPH      = `https://graph.facebook.com/${GVER}`;
const LARK_CLI   = CFG.LARK_CLI || 'lark-cli.cmd';
const DRY        = process.argv.includes('--dry-run');

// Thư mục làm việc tạm — KHÔNG đặt trong thư mục dự án (có dấu cách + tiếng Việt
// làm lark-cli @file / --output lỗi). Dùng %TEMP%\reel-work.
const WORK = path.join(os.tmpdir(), 'reel-work');
fs.mkdirSync(WORK, { recursive: true });

// Field names (đúng như trên Base)
const F = {
  trigger:  'TT Reel',
  media:    'Ảnh/video',
  caption:  'Nội dung',
  hashtag:  'Hastag',
  link:     'Link Reel',
  log:      'Log đăng Reel',
  schedule: 'Lịch đăng',
};

// Đổi ô datetime ("Lịch đăng") thành mốc thời gian (ms) để so với hiện tại.
// CLI trả datetime dạng chuỗi giờ địa phương "YYYY-MM-DD HH:mm:ss" (máy +07).
function scheduleMs(cell) {
  if (cell == null) return null;
  if (typeof cell === 'number') return cell; // phòng trường hợp trả epoch ms
  const t = plainText(cell).trim();
  if (!t) return null;
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.getTime();
}
function fmt(ms) { return new Date(ms).toISOString().replace('T', ' ').slice(0, 16); }

// Phân loại lỗi: vĩnh viễn (đừng thử lại) vs tạm thời (thử lại sau).
function isPermanent(msg) {
  const m = String(msg).toLowerCase();
  return /(oauth|code\D*190|access token|token.*(invalid|expire)|permission|duration|too short|too long|aspect|format|unsupported|invalid.*(video|param)|copyright|không có file)/.test(m);
}
// Đọc số lần đã thử từ cột Log ("RETRY n/3").
function retryCount(logText) {
  const m = String(logText || '').match(/RETRY\s*(\d+)\s*\//);
  return m ? +m[1] : 0;
}

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (...a) => console.log(`[${now()}]`, ...a);

// Khoá chống chạy chồng: nếu lần đăng trước (video lớn) còn chạy thì lần này bỏ qua.
const LOCK = path.join(WORK, 'post-reels.lock');
function acquireLock() {
  try {
    if (fs.existsSync(LOCK)) {
      const ageMin = (Date.now() - fs.statSync(LOCK).mtimeMs) / 60000;
      if (ageMin < 30) return false;      // còn tươi (<30') -> đang có tiến trình chạy
    }
    fs.writeFileSync(LOCK, String(process.pid));
    return true;
  } catch { return true; }
}
function releaseLock() { try { fs.unlinkSync(LOCK); } catch {} }

// ---------- Lark helper ----------
function lark(args, opts = {}) {
  const res = spawnSync(LARK_CLI, args, {
    cwd: opts.cwd || WORK,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    shell: true,
    windowsHide: true,
  });
  const out = res.stdout || '';
  const i = out.indexOf('{');
  if (i < 0) throw new Error('lark-cli không trả JSON: ' + ((res.stderr || out) || '').slice(0, 400));
  const j = JSON.parse(out.slice(i));
  if (j.ok === false) throw new Error('lark-cli lỗi: ' + JSON.stringify(j.error || j));
  return j;
}

// Đọc toàn bộ records (phân trang) ở dạng bảng: data.fields / data.data / data.record_id_list
function listAllRows() {
  const rows = [];
  let offset = 0;
  for (;;) {
    const j = lark([
      'base', '+record-list',
      '--base-token', BASE_TOKEN,
      '--table-id', TABLE_ID,
      '--limit', '200',
      '--offset', String(offset),
      '--format', 'json',
      '--as', 'user',
    ]);
    const D = j.data;
    const names = D.fields.map(f => f.name || f);
    const idx = {};
    names.forEach((n, k) => { idx[n] = k; });
    const data = D.data || [];
    const ids = D.record_id_list || [];
    for (let r = 0; r < data.length; r++) {
      rows.push({ id: ids[r], cells: data[r], idx });
    }
    if (!D.has_more) break;
    offset += data.length || 200;
    if (data.length === 0) break;
  }
  return rows;
}

// ---------- Trích giá trị ô ----------
function selectNames(cell) {
  if (cell == null) return [];
  if (Array.isArray(cell)) return cell.map(x => (typeof x === 'string' ? x : (x.text || x.name || ''))).filter(Boolean);
  if (typeof cell === 'object') return [cell.text || cell.name].filter(Boolean);
  return [String(cell)];
}
function plainText(cell) {
  if (cell == null) return '';
  if (typeof cell === 'string') return cell;
  if (Array.isArray(cell)) return cell.map(seg => (typeof seg === 'string' ? seg : (seg.text || seg.link || ''))).join('');
  if (typeof cell === 'object') return cell.text || cell.link || '';
  return String(cell);
}
function get(row, name) { return row.cells[row.idx[name]]; }

// ---------- Tải attachment video về máy ----------
function downloadVideo(recId, att) {
  const safe = `${recId}_${(att.name || 'video.mp4').replace(/[^\w.\-]/g, '_')}`;
  const outRel = './' + safe;
  lark([
    'base', '+record-download-attachment',
    '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID,
    '--record-id', recId,
    '--file-token', att.file_token,
    '--output', outRel,
    '--overwrite',
    '--as', 'user',
  ], { cwd: WORK });
  const p = path.join(WORK, safe);
  if (!fs.existsSync(p)) throw new Error('Tải video thất bại: ' + safe);
  return p;
}

// ---------- Facebook Reels (3 pha) ----------
async function fbFetch(url, opts) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  let j;
  try { j = JSON.parse(txt); } catch { j = { _raw: txt }; }
  if (!res.ok || j.error) throw new Error('FB ' + res.status + ': ' + JSON.stringify(j.error || j._raw || j));
  return j;
}

async function postReel(videoPath, caption) {
  // Pha 1: start
  const start = await fbFetch(`${GRAPH}/${PAGE_ID}/video_reels?upload_phase=start&access_token=${encodeURIComponent(TOKEN)}`, { method: 'POST' });
  const videoId = start.video_id;
  const uploadUrl = start.upload_url;
  if (!videoId || !uploadUrl) throw new Error('FB start thiếu video_id/upload_url: ' + JSON.stringify(start));

  // Pha 2: upload binary
  const buf = fs.readFileSync(videoPath);
  await fbFetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${TOKEN}`,
      offset: '0',
      file_size: String(buf.length),
    },
    body: buf,
  });

  // Pha 3: finish + publish + caption
  const body = new URLSearchParams({
    upload_phase: 'finish',
    video_id: videoId,
    video_state: 'PUBLISHED',
    description: caption || '',
    access_token: TOKEN,
  });
  await fbFetch(`${GRAPH}/${PAGE_ID}/video_reels`, { method: 'POST', body });

  // Chờ FB xử lý xong + lấy permalink
  let permalink = '';
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 6000));
    try {
      const st = await fbFetch(`${GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(TOKEN)}`, { method: 'GET' });
      const phase = st.status && (st.status.video_status || (st.status.processing_phase && st.status.processing_phase.status));
      if (st.permalink_url) permalink = st.permalink_url;
      if (phase === 'ready' || phase === 'PUBLISHED' || (st.status && st.status.video_status === 'ready')) break;
      if (phase === 'error') throw new Error('FB xử lý video lỗi: ' + JSON.stringify(st.status));
    } catch (e) {
      // bỏ qua lỗi poll tạm thời
    }
  }
  if (permalink && permalink.startsWith('/')) permalink = 'https://www.facebook.com' + permalink;
  return { videoId, permalink };
}

// ---------- Ghi ngược Base ----------
function updateRecord(recId, patch) {
  const name = `upd_${recId}.json`;
  fs.writeFileSync(path.join(WORK, name), JSON.stringify({ record_id_list: [recId], patch }), 'utf8');
  // lark-cli yêu cầu @file là path TƯƠNG ĐỐI trong cwd -> cwd = WORK, truyền ./name
  lark([
    'base', '+record-batch-update',
    '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID,
    '--json', '@./' + name,
    '--as', 'user',
  ], { cwd: WORK });
}

// ---------- Main ----------
(async () => {
  if (!DRY && (!PAGE_ID || !TOKEN)) {
    console.error('!! Chưa cấu hình FB_PAGE_ID / FB_PAGE_TOKEN trong config.local.json');
    process.exit(1);
  }
  if (!DRY && !acquireLock()) {
    log('Đang có tiến trình đăng chạy (lock còn tươi) — bỏ qua lần này.');
    return;
  }
  log(`Quét Base, tìm dòng "${F.trigger}" = "${TRIGGER}" ...`);
  const rows = listAllRows();
  const targets = rows.filter(r => selectNames(get(r, F.trigger)).includes(TRIGGER));
  log(`Tìm thấy ${targets.length} video chờ đăng (tổng ${rows.length} dòng).`);

  let okCount = 0, errCount = 0, waitCount = 0;
  const nowMs = Date.now();
  for (const row of targets) {
    const recId = row.id;

    // Cổng lịch đăng: chưa tới giờ thì để lại lần quét sau.
    if (RESPECT_SCHEDULE) {
      const schedCell = get(row, F.schedule);
      const sched = scheduleMs(schedCell);
      if (sched && sched > nowMs) {
        log(`  [CHỜ GIỜ] ${recId}: hẹn ${plainText(schedCell) || fmt(sched)}, chưa tới — bỏ qua.`);
        waitCount++;
        continue;
      }
    }

    const media = get(row, F.media);
    const att = Array.isArray(media) ? media.find(a => /\.(mp4|mov|m4v|webm|avi)$/i.test(a.name || '')) || media[0] : null;
    const nd = plainText(get(row, F.caption));
    const hash = plainText(get(row, F.hashtag));
    const caption = [nd, hash].filter(Boolean).join('\n\n').trim();

    if (!att || !att.file_token) {
      log(`  [BỎ QUA] ${recId}: không có file đính kèm.`);
      if (!DRY) updateRecord(recId, { [F.trigger]: 'Lỗi', [F.log]: `${now()} - không có file video` });
      errCount++;
      continue;
    }

    log(`  >> ${recId}: "${(att.name || '').slice(0, 40)}" (${Math.round((att.size || 0) / 1024 / 1024 * 10) / 10}MB)`);
    if (DRY) {
      log(`     [DRY] sẽ đăng với caption: ${caption.slice(0, 80).replace(/\n/g, ' ')}...`);
      continue;
    }

    let videoPath;
    try {
      videoPath = downloadVideo(recId, att);
      const { videoId, permalink } = await postReel(videoPath, caption);
      updateRecord(recId, {
        [F.trigger]: 'Đã đăng',
        [F.link]: permalink || '',
        [F.log]: `${now()} - OK - video_id ${videoId}`,
      });
      log(`     ✔ ĐÃ ĐĂNG. ${permalink || '(đang xử lý, kiểm tra sau)'}`);
      okCount++;
    } catch (e) {
      const msg = String(e.message || e).slice(0, 400);
      const tries = retryCount(plainText(get(row, F.log))) + 1;
      if (!isPermanent(msg) && tries < MAX_RETRY) {
        // Lỗi tạm thời -> giữ "Chờ đăng" để lần quét sau tự thử lại.
        log(`     ↻ Lỗi tạm thời (lần ${tries}/${MAX_RETRY}), sẽ thử lại: ${msg}`);
        try { updateRecord(recId, { [F.trigger]: TRIGGER, [F.log]: `${now()} - RETRY ${tries}/${MAX_RETRY} - ${msg}` }); } catch {}
      } else {
        const why = isPermanent(msg) ? 'LỖI VĨNH VIỄN' : `HẾT ${MAX_RETRY} LƯỢT THỬ`;
        log(`     ✖ ${why}: ${msg}`);
        try { updateRecord(recId, { [F.trigger]: 'Lỗi', [F.log]: `${now()} - ${why} - ${msg}` }); } catch {}
        errCount++;
      }
    } finally {
      if (videoPath) { try { fs.unlinkSync(videoPath); } catch {} }
    }
  }

  log(`Xong. Thành công: ${okCount}, Lỗi: ${errCount}, Chờ tới giờ: ${waitCount}.`);
  releaseLock();
})().catch(e => { releaseLock(); console.error('FATAL', e); process.exit(1); });
