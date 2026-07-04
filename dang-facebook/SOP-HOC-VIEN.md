# SOP — Hệ thống ĐĂNG BÀI FACEBOOK TỰ ĐỘNG từ Lark Base

> **Dành cho học viên.** Bạn sẽ tự dựng hệ thống này trên **tài khoản của chính bạn**.
> **Mọi khoá/token trong SOP là của BẠN** — không dùng chung với ai. Bộ code này đã được gỡ sạch key cá nhân; bạn tự điền key của mình theo hướng dẫn.

---

## 0. Hệ thống này làm gì?

```
        BẠN nhập trong Lark                    MÁY tự làm
   ┌────────────────────────┐        ┌──────────────────────────────┐
   │ Lark Base              │        │ GitHub Actions               │
   │  • Bảng "Đăng Reel"    │  ───▶  │  • cron 30' / hoặc bấm tay   │ ───▶  Facebook Page(s)
   │  • Bảng "Fanpage"      │        │  • tải file, đăng Graph API  │       (đăng Reel / ảnh)
   └────────────────────────┘        └──────────────────────────────┘
              ▲                                                              │
              └──────────────  ghi Link bài + Trạng thái về Base  ◀──────────┘
```

- **Bạn:** đính video/ảnh + viết nội dung + chọn Page + đặt "Lịch đăng bài".
- **Máy:** tới giờ tự đăng lên **tất cả Page** đã chọn, rồi ghi **Link bài đăng** + **Trạng thái** về Base.
- Đăng cùng nội dung lên **nhiều Page cùng lúc**. Có auto-comment #1.

---

## 0.1. BẢNG KEY bạn phải tự lấy (6 khoá)

| # | KEY | Là gì | Lấy ở bước | Cuối cùng nhập vào |
|---|---|---|---|---|
| 1 | `LARK_APP_ID` | ID app Lark của bạn | Phần 3 | GitHub Secrets |
| 2 | `LARK_APP_SECRET` | Secret app Lark (🔒 bí mật) | Phần 3 | GitHub Secrets |
| 3 | `LARK_APP_TOKEN` | Token của Base | Phần 2.2 | GitHub Secrets |
| 4 | `LARK_TABLE_ID` | ID bảng "Đăng Reel" | Phần 2.2 | GitHub Secrets |
| 5 | `PAGES_TABLE_ID` | ID bảng "Fanpage" | Phần 2.2 | GitHub Secrets |
| 6 | `FB_USER_TOKEN` | Token Facebook (🔒 bí mật) | Phần 4 | Dùng 1 lần để nạp token Page vào bảng Fanpage |

> 🔒 = tuyệt đối không đưa cho ai, không dán lên chỗ công khai.

---

## PHẦN 1 — Chuẩn bị (cần 3 tài khoản)

- [ ] **Lark / Larksuite** — có 1 Base để làm việc.
- [ ] **Facebook** — bạn là **Admin** của ít nhất 1 Fanpage.
- [ ] **GitHub** — 1 tài khoản (miễn phí).

---

## PHẦN 2 — Dựng Lark Base (2 bảng)

### 2.1. Tạo 2 bảng đúng tên cột (phân biệt hoa/thường & dấu)

**Bảng `Đăng Reel`** — nơi bạn nhập bài:

| Cột | Kiểu | Ai điền |
|---|---|---|
| `Page` | **Link** → trỏ tới bảng `Fanpage` | Bạn (chọn 1 hay nhiều Page) |
| `Loại` | Single select: `Video`, `Hình ảnh` | Bạn |
| `Nội dung` | Text | Bạn (caption) |
| `Comment ebook` | Text | Bạn (tuỳ chọn — comment #1) |
| `Ảnh/video` | Attachment | Bạn (MP4 dọc 9:16, 3–90s / ảnh) |
| `Lịch đăng bài` | DateTime | Bạn (giờ muốn đăng) |
| `Đăng` | Checkbox | Bạn (tuỳ chọn — tick để đăng ngay) |
| `Trạng thái` | Single select: `Thành công`, `Thất bại` | 🤖 Máy |
| `Log` | Text | 🤖 Máy |
| `Link bài đăng` | **Text** | 🤖 Máy (chứa link mọi Page) |

**Bảng `Fanpage`** — kho Page + token:

| Cột | Kiểu | Nội dung |
|---|---|---|
| `Fanpage` | Text | Tên Page |
| `ID` | Text | Facebook Page ID |
| `access_token` | Text | Token của Page (🔒) |
| `Category` / `Follower` / `Avatar` | Text/Number | (tuỳ chọn, máy tự ghi) |

### 2.2. Lấy KEY 3, 4, 5 từ URL Base
Mở Base trên trình duyệt, nhìn thanh địa chỉ:
```
https://xxx.larksuite.com/base/ZZZZZZZZZZ?table=tttttttttt&view=...
                               └── KEY 3 ─┘        └─ KEY 4/5 ┘
```
- **KEY 3 `LARK_APP_TOKEN`** = đoạn sau `/base/`.
- **KEY 4 `LARK_TABLE_ID`** = `table=` khi bạn đang mở **bảng Đăng Reel**.
- **KEY 5 `PAGES_TABLE_ID`** = `table=` khi bạn mở **bảng Fanpage**.

---

## PHẦN 3 — Tạo App Lark (lấy KEY 1, 2)

Hệ thống cần 1 App Lark để đọc/ghi Base và tải file.

1. Vào **Lark Developer Console** → **Create Custom App**.
2. Vào **Permissions & Scopes** → bật:
   - Quyền **Base (bitable)**: đọc & ghi bản ghi/bảng.
   - Quyền **Drive/Docs**: tải file đính kèm (để tải video/ảnh về đăng).
3. **Publish / Release** app trong workspace của bạn (để quyền có hiệu lực).
4. Vào **Credentials** → copy **App ID** = **KEY 1**, **App Secret** = **KEY 2**.
5. **Cấp quyền app vào Base:** mở Base → *Chia sẻ / …* → thêm **app của bạn** làm cộng tác viên **quyền Chỉnh sửa** (nếu không app sẽ báo lỗi quyền khi ghi).

---

## PHẦN 4 — Lấy token Facebook (KEY 6)

1. Vào **developers.facebook.com** → tạo 1 **App** (loại Business).
2. Mở **Graph API Explorer** → chọn App của bạn.
3. **Add a Permission**, tick 4 quyền:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`
4. **Generate Access Token** → đăng nhập/Authorize → được token (User token, ngắn hạn).
5. **Gia hạn 60 ngày:** vào **Access Token Debugger** (developers.facebook.com/tools/debug/accesstoken) → dán token → **Extend Access Token** → copy token dài hạn = **KEY 6**.

---

## PHẦN 5 — GitHub (repo + nạp 5 Secrets)

1. **Tạo repo của bạn** từ bộ code này: bấm **Use this template** (hoặc *Fork* / *Import repository*). Repo có thể để **Private**.
2. Vào tab **Actions** → nếu hỏi, bấm **"I understand… enable"** để bật workflow.
3. Vào **Settings → Secrets and variables → Actions → New repository secret**, tạo lần lượt **5 secret** (dán đúng KEY của bạn):
   - `LARK_APP_ID` (KEY 1)
   - `LARK_APP_SECRET` (KEY 2)
   - `LARK_APP_TOKEN` (KEY 3)
   - `LARK_TABLE_ID` (KEY 4)
   - `PAGES_TABLE_ID` (KEY 5)

> Workflow `dang-bai-facebook.yml` đã có sẵn: chạy **tự động 30 phút/lần** + cho **bấm tay**. Không cần sửa code.

---

## PHẦN 6 — Nạp token Page vào bảng `Fanpage`

**Cách A — thủ công (nhanh, hợp khi có 1–2 Page):**
1. Trong Graph API Explorer, đổi ô token từ *User Token* sang **tên Page** của bạn → copy **Page Access Token**.
2. Lấy **Page ID** (Explorer gọi `GET /me/accounts`, hoặc trong Cài đặt Page).
3. Vào bảng `Fanpage`, thêm 1 dòng: `Fanpage` = tên, `ID` = Page ID, `access_token` = token vừa copy.

**Cách B — tự động (nhiều Page):**
- Máy tính có **Node 18+**. Trong thư mục `dang-facebook/scripts`, tạo file `fetch-pages.local.json` (theo mẫu `fetch-pages.local.json.example`), điền KEY 1,2,3, `LARK_TABLE_ID` = KEY 5 (bảng Fanpage), và `FB_USER_TOKEN` = KEY 6.
- Chạy: `node fetch-pages-to-lark.js --update` → tự lấy mọi Page + token ghi vào bảng Fanpage.

---

## PHẦN 7 — Chạy & dùng hằng ngày

### 7.1. Test lần đầu
1. Trong bảng `Đăng Reel`, thêm 1 dòng: chọn **Page** + đính **file** + viết **Nội dung** + `Lịch đăng bài` để **giờ quá khứ** (vd hôm qua).
2. Tab **Actions** → workflow *"Đăng bài Facebook…"* → **Run workflow** → bật **dry_run** (chỉ liệt kê, không đăng) → xem log có nhận đúng dòng không.
3. Ổn thì **Run workflow** lần nữa, **tắt dry_run** → bài lên thật.

### 7.2. Dùng tự động (khuyên dùng)
- Cứ thêm dòng: **Page + file + nội dung + `Lịch đăng bài`**.
- Cron quét **mỗi 30 phút** → tới giờ hẹn là **tự đăng** lên mọi Page + ghi link. Không cần bấm gì.
- Muốn đăng ngay không chờ lịch: **tick ô `Đăng`**.

---

## PHẦN 8 — Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Log ghi `OAuthException / token` | Token FB hết hạn (~60 ngày) | Lấy token mới (Phần 4) → nạp lại (Phần 6) |
| `Page thiếu ID/token` | Bảng Fanpage chưa có ID/token | Điền lại cột `ID` + `access_token` |
| Lỗi định dạng/độ dài | Video sai chuẩn | MP4 **dọc 9:16, 3–90 giây** |
| Bài không lên dù đã hẹn giờ | Chưa tới lượt quét, hoặc cron bị tắt | Chờ ≤30', hoặc Run workflow tay |
| Cron ngừng chạy | GitHub **tắt cron sau 60 ngày repo không đổi** | Sửa 1 file bất kỳ + commit để "đánh thức" |
| Ghi Base lỗi quyền | App Lark chưa được cấp quyền vào Base | Phần 3, bước 5 |

---

## PHẦN 9 — Ô điền KEY của BẠN (giữ riêng tư)

```
LARK_APP_ID     = ______________________________
LARK_APP_SECRET = ______________________________   🔒
LARK_APP_TOKEN  = ______________________________
LARK_TABLE_ID   = ______________________________   (bảng Đăng Reel)
PAGES_TABLE_ID  = ______________________________   (bảng Fanpage)
FB_USER_TOKEN   = ______________________________   🔒
```

---

## ⚠️ Nguyên tắc bảo mật (bắt buộc)
- KEY chỉ nằm ở **GitHub Secrets** hoặc file **`*.local.json`** (đã được `.gitignore` chặn, KHÔNG commit).
- **Không** dán KEY vào code, vào bài đăng, hay gửi cho người khác.
- Mỗi học viên **1 bộ KEY riêng** — không dùng chung token giữa các Page/tài khoản.
