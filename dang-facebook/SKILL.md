---
name: dang-bai-facebook
description: Hệ thống đăng bài Facebook (Reel + ảnh) từ Lark Base lên Facebook Page qua GitHub Actions. Chạy TỰ ĐỘNG theo lịch (cron 30') hoặc bấm tay. Mỗi dòng tự chọn Page qua cột link, dùng đúng token của Page đó (lấy từ bảng Fanpage). Dùng khi cần dựng/bàn giao hệ thống đăng bài tự động cho học viên/khách, sửa logic đăng, hoặc xử lý lỗi token Facebook.
---

# Đăng bài Facebook tự động (Lark Base → GitHub Actions → FB Page)

Người dùng nhập bài vào **Lark Base** (chọn Page + đính video/ảnh + nội dung + lịch đăng). **GitHub Actions**
tự chạy `post-multi-reel-api.js`: quét bảng, tải media từ Base, đăng lên **tất cả Page** đã chọn qua Facebook
Graph API, rồi ghi **Link bài + Trạng thái + Log** ngược về Base. Không cần máy bật liên tục, không cần lark-cli.

> ⚠️ Bộ code này đã được **gỡ sạch mọi ID/Secret/token** của người đóng gói. **Mỗi học viên tự nhập dữ liệu
> của chính mình** (khóa Lark, token Facebook, ID bảng). Không có giá trị mặc định ngầm nào.

## Kiến trúc & luồng
```
Lark Base (bảng Đăng Reel + bảng Fanpage)
   │   GitHub Actions: cron mỗi 30' HOẶC Run workflow (bấm tay / API dispatch)
   ▼
post-multi-reel-api.js:
   1. Lark Open API (tenant token) → đọc dòng cần đăng (cổng "Đăng" / "Lịch đăng bài")
   2. drive/medias → tải video/ảnh từ Base về máy runner
   3. Với mỗi Page (link sang bảng Fanpage) → dùng đúng ID + access_token của Page
   4. Facebook Graph API: Reel (video_reels 3 pha) hoặc ảnh (photos/feed) + auto-comment #1
   5. Ghi ngược Base: Trạng thái = Thành công/Thất bại + Link bài đăng + Log
```
**Điểm mấu chốt:** upload thẳng Graph API (không qua trung gian) → không dính trần dung lượng; đăng **nhiều Page** cùng lúc.

## Chạy hằng ngày (sau khi đã cài)
- Thêm dòng trong bảng **Đăng Reel**: chọn `Page` + đính `Ảnh/video` + `Nội dung` + đặt `Lịch đăng bài`.
- Cron quét **mỗi 30 phút** → tới giờ hẹn tự đăng. Muốn đăng ngay không chờ lịch → tick ô `Đăng`.
- Bấm tay: tab **Actions** → *"Đăng bài Facebook…"* → **Run workflow** (có tuỳ chọn `dry_run` để soi log trước).

## Cài đặt / bàn giao cho học viên (3 bước — mỗi người 1 bộ khóa RIÊNG)
Chi tiết từng nút bấm ở [SOP-HOC-VIEN.md](../SOP-HOC-VIEN.md). Tóm tắt:

1. **Repo + token GitHub:** tạo repo riêng từ template này (**Use this template**), có PAT GitHub scope `repo`+`workflow`.
2. **Biến môi trường → GitHub Secrets:** nạp 5 khóa Lark (bảng dưới). Làm tay trong *Settings → Secrets*, hoặc
   tự động 1 lệnh: `node dang-facebook/scripts/cai-dat-github.mjs all` (cần `gh` CLI + Node 18+).
3. **ID + token Facebook:** nạp **Page ID + Page access_token** vào **bảng Fanpage** trên Lark Base
   (thủ công, hoặc chạy `node fetch-pages-to-lark.js --update` với `FB_USER_TOKEN` của bạn).

### 5 GitHub Secrets (mỗi học viên tự điền của mình)
| Secret | Là gì |
|---|---|
| `LARK_APP_ID` | App ID app Lark của bạn |
| `LARK_APP_SECRET` | App Secret app Lark 🔒 |
| `LARK_APP_TOKEN` | Token của Base (đoạn sau `/base/` trên URL) |
| `LARK_TABLE_ID` | ID bảng **Đăng Reel** (`table=` trên URL) |
| `PAGES_TABLE_ID` | ID bảng **Fanpage** (`table=` trên URL) |

> Token Facebook **KHÔNG** để trong Secrets — runner đọc từ cột `access_token` của **bảng Fanpage**.

## File trong repo
- `.github/workflows/dang-bai-facebook.yml` — workflow: cron `*/30` + `workflow_dispatch` (dry_run / post_all / record_id).
- `scripts/post-multi-reel-api.js` — ⭐ runner chính (Reel + ảnh, nhiều Page). Lệnh workflow chạy.
- `scripts/post-feed-api.js` — đăng bài feed/ảnh lên Page (biến thể).
- `scripts/post-reels-api.js` — biến thể đăng Reel 1 Page qua `FB_PAGE_ID`/`FB_PAGE_TOKEN` (env).
- `scripts/fetch-pages-to-lark.js` — nạp danh sách Page + token vào bảng Fanpage (cần `FB_USER_TOKEN`).
- `scripts/fetch-posts-to-lark.js` — lấy danh sách bài viết Page về Base.
- `scripts/cai-dat-github.mjs` — tự động tạo repo từ template + nạp 5 Secrets bằng token học viên.
- `scripts/*.local.json.example` — **mẫu cấu hình**: copy thành `*.local.json` (đã bị `.gitignore` chặn) rồi tự điền khóa.
- `scripts/*.bat` / `*.ps1` — wrapper chạy tay trên Windows (đọc khóa từ `fetch-pages.local.json`).

## Cấu hình (KHÔNG hardcode — đọc từ env / Secrets / *.local.json)
Mọi script đọc khóa qua biến môi trường (GitHub Secrets khi chạy Actions, hoặc `*.local.json` khi chạy tay).
Biến chính: `LARK_APP_ID`, `LARK_APP_SECRET`, `LARK_APP_TOKEN`, `LARK_TABLE_ID`, `PAGES_TABLE_ID`; tuỳ chọn
`FB_USER_TOKEN` (nạp Page), `FB_PAGE_ID`/`FB_PAGE_TOKEN` (biến thể 1 Page), `LARK_DOMAIN`, `GRAPH_VERSION`, `RESPECT_SCHEDULE`.

## Lỗi thường gặp
- **Log `OAuthException / token`** → token FB hết hạn (~60 ngày). Lấy token mới → cập nhật cột `access_token` bảng Fanpage.
- **`Page thiếu ID/token`** → bảng Fanpage chưa điền `ID` hoặc `access_token`.
- **Lỗi định dạng/độ dài** → Reel phải MP4 dọc 9:16, 3–90 giây.
- **Bài không lên dù đã hẹn giờ** → chờ ≤30' (cron), hoặc Run workflow tay.
- **Cron ngừng chạy** → GitHub tắt cron sau 60 ngày repo không đổi; sửa 1 file + commit để "đánh thức".
- **Ghi Base lỗi quyền** → app Lark chưa được cấp quyền Chỉnh sửa vào Base.

## Bảo mật (bắt buộc)
- Khóa chỉ nằm ở **GitHub Secrets** hoặc **`*.local.json`** (đã `.gitignore` chặn). KHÔNG commit, KHÔNG dán vào code/bài đăng.
- **Mỗi học viên 1 bộ khóa riêng** — không dùng chung token/secret giữa các tài khoản/Page.
