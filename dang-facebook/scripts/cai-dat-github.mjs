#!/usr/bin/env node
/**
 * cai-dat-github.mjs — Tự động BÀN GIAO hệ thống "Đăng bài Facebook từ Lark Base" cho học viên.
 *
 * Dùng TOKEN GitHub của HỌC VIÊN để:
 *   1) Tạo repo mới TỪ TEMPLATE (repo nguồn đã chứa sẵn code + workflow).
 *   2) Nạp 5 GitHub Secrets (bộ khóa Lark) vào repo mới.
 *   3) Chạy thử workflow ở chế độ dry-run (chỉ liệt kê, KHÔNG đăng) để kiểm tra.
 *
 * KHÔNG hardcode secret nào — MỌI giá trị đọc từ BIẾN MÔI TRƯỜNG.
 * Yêu cầu: gh CLI (>=2.4) + Node 18+.
 *
 * ── BIẾN MÔI TRƯỜNG ──────────────────────────────────────────────
 *   GH_TOKEN        (bắt buộc)  PAT của học viên — scope: repo + workflow
 *   NEW_REPO        (bắt buộc)  tên repo mới trên tài khoản học viên, vd "reel-facebook"
 *   SOURCE_REPO     (tùy chọn)  repo template nguồn (mặc định nguyenlanh282/mentor_club_app)
 *   VISIBILITY      (tùy chọn)  private | public (mặc định private)
 *   LARK_APP_ID, LARK_APP_SECRET, LARK_APP_TOKEN, LARK_TABLE_ID, PAGES_TABLE_ID
 *                   (bắt buộc cho bước "secrets"/"all")
 *
 * ── CÁCH CHẠY ────────────────────────────────────────────────────
 *   node cai-dat-github.mjs create    # chỉ tạo repo từ template
 *   node cai-dat-github.mjs secrets    # chỉ nạp 5 secrets
 *   node cai-dat-github.mjs verify     # chạy thử dry-run
 *   node cai-dat-github.mjs all        # (mặc định) làm cả 3 bước
 */
import { spawnSync } from 'node:child_process';

const MODE = (process.argv[2] || 'all').toLowerCase();
const E = process.env;
const trim = (v) => (v || '').trim();
function need(n) {
  const v = trim(E[n]);
  if (!v) { console.error(`\n!! Thiếu biến môi trường ${n} — hãy đặt trước khi chạy.`); process.exit(1); }
  return v;
}

const SOURCE = trim(E.SOURCE_REPO) || 'nguyenlanh282/mentor_club_app';
const VIS = (trim(E.VISIBILITY) || 'private').toLowerCase() === 'public' ? 'public' : 'private';
const SECRET_NAMES = ['LARK_APP_ID', 'LARK_APP_SECRET', 'LARK_APP_TOKEN', 'LARK_TABLE_ID', 'PAGES_TABLE_ID'];

// gh chạy với token của học viên (GH_TOKEN). GH_PROMPT_DISABLED để không hỏi tương tác.
const ghEnv = { ...E, GH_TOKEN: need('GH_TOKEN'), GH_PROMPT_DISABLED: '1' };

function gh(args, input) {
  const r = spawnSync('gh', args, { env: ghEnv, input, encoding: 'utf8' });
  if (r.error) { console.error('!! Không gọi được gh CLI:', r.error.message, '\n   → Cài GitHub CLI: https://cli.github.com'); process.exit(1); }
  return r;
}
function ghOK(args, input, label) {
  const r = gh(args, input);
  if (r.status !== 0) { console.error(`!! Lỗi khi ${label}:\n${(r.stderr || r.stdout || '').trim()}`); process.exit(1); }
  return trim(r.stdout);
}

function whoami() { return ghOK(['api', 'user', '--jq', '.login'], undefined, 'đọc tài khoản GitHub (token đúng chưa?)'); }

function createRepo(owner) {
  const full = `${owner}/${need('NEW_REPO')}`;
  if (gh(['repo', 'view', full, '--json', 'name']).status === 0) {
    console.log(`• Repo ${full} đã tồn tại — bỏ qua bước tạo mới.`);
    return full;
  }
  console.log(`• Tạo repo ${full} từ template ${SOURCE} (${VIS})…`);
  const r = gh(['repo', 'create', full, '--template', SOURCE, `--${VIS}`]);
  if (r.status !== 0) {
    console.error(`!! Không tạo được repo từ template:\n${(r.stderr || '').trim()}`);
    console.error('   → Kiểm tra: (a) repo nguồn đã bật "Template repository" chưa?  (b) PAT có scope "repo" chưa?');
    console.error(`   → Cách khác (fork): gh repo fork ${SOURCE} --fork-name ${need('NEW_REPO')}`);
    process.exit(1);
  }
  console.log(`  ✓ Đã tạo ${full}`);
  return full;
}

function setSecrets(full) {
  console.log(`• Nạp ${SECRET_NAMES.length} GitHub Secrets vào ${full}…`);
  for (const n of SECRET_NAMES) {
    const val = need(n);                                  // giá trị truyền qua STDIN → không lộ trong danh sách tiến trình
    ghOK(['secret', 'set', n, '--repo', full], val, `nạp secret ${n}`);
    console.log(`  ✓ ${n} (${val.length} ký tự)`);
  }
}

function verify(full) {
  console.log('• Chạy thử workflow ở chế độ dry-run (chỉ liệt kê, KHÔNG đăng)…');
  const r = gh(['workflow', 'run', 'dang-bai-facebook.yml', '--repo', full, '-f', 'dry_run=true']);
  if (r.status !== 0) {
    console.error('!! Chưa dispatch được workflow (Actions có thể chưa bật trên repo mới).');
    console.error(`   ${(r.stderr || '').trim()}`);
    console.error(`   → Mở tab Actions của ${full}, bấm "I understand… enable", rồi chạy lại: node cai-dat-github.mjs verify`);
    return;
  }
  console.log('  ✓ Đã gửi lệnh chạy thử. Theo dõi kết quả:');
  console.log(`     gh run watch --repo ${full}      (hoặc mở tab Actions của repo)`);
}

// ── luồng chính ──────────────────────────────────────────────────
const owner = whoami();
console.log(`GitHub: đăng nhập bằng token của @${owner}\n`);
let full = `${owner}/${trim(E.NEW_REPO) || ''}`;
if (MODE === 'create' || MODE === 'all') full = createRepo(owner);
if (MODE === 'secrets' || MODE === 'all') { need('NEW_REPO'); setSecrets(full); }
if (MODE === 'verify' || MODE === 'all') verify(full);
console.log('\n✅ Xong.');
