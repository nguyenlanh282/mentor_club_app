# README cho ADMIN — Chuẩn bị bộ chuyển giao (làm 1 lần)

Bộ này để học viên cài đặt hệ thống tự đăng Reel lên Facebook **trên máy của họ**. Trước khi gửi, anh (admin) chuẩn bị mấy thứ sau.

## 0. Bộ gồm những gì
```
ban-chuyen-giao/
├── CAI-DAT.bat            # Học viên bấm đúp để cài
├── setup.ps1             # Trình cài đặt (wizard)
├── post-reels.js         # Bộ máy đăng (không cần sửa)
├── run-reels.ps1         # Wrapper chạy
├── run-hidden.vbs        # Chạy ẩn (không cửa sổ)
├── register-task.ps1     # Đăng ký lịch chạy ẩn 2 phút
├── init-app.js           # Nạp App Lark
├── _app.json             # ⚠️ ADMIN điền App Secret (xem mục 1)
├── config.local.json     # Wizard tự ghi (để trống sẵn)
├── HUONG-DAN-HOC-VIEN.md # Gửi kèm cho học viên
└── README-ADMIN.md       # File này (KHÔNG gửi học viên)
```

## 1. Điền App Lark dùng chung — `_app.json`
Hệ thống cần 1 App Lark để `lark-cli` thao tác Base. Dùng chung 1 app cho cả nhóm (vd app **"ADS -> LARK"**, App ID `cli_APP-ID-CUA-BAN`).
- Mở `_app.json`, điền **`APP_SECRET`** (lấy ở Lark Developer Console → app → Credentials).
- `BRAND` để `lark` (vì dùng larksuite.com).

> ⚠️ Vì `_app.json` chứa App Secret → **đây là file nhạy cảm**. Gửi bộ này qua kênh riêng tư, đừng public lên mạng/GitHub.

**Điều kiện để học viên dùng được app này:** học viên phải ở trong **cùng workspace Lark** (hoặc app được cài cho tổ chức của họ), và app có sẵn các quyền (scope) base + drive. App "ADS -> LARK" hiện đã có gần đủ scope cần.

## 2. Tạo Base mẫu để học viên nhân bản
Đã có sẵn 1 Base mẫu chuẩn (đủ field TT Reel / Ảnh-video / Nội dung / Hastag / Lịch đăng / Link Reel / Log / Loại):
- **Link Base mẫu:** https://<workspace-cua-ban>.larksuite.com/base/<BASE-TOKEN-CUA-BAN>
- Chia sẻ link này cho học viên + bật quyền cho họ **Tạo bản sao (Make a copy)**.
- (Nếu muốn mỗi khoá 1 mẫu riêng, cứ nhân bản Base này rồi gửi link bản mới.)

## 3. Lấy token Facebook cho TỪNG học viên (khâu anh làm hộ)
Mỗi học viên đăng lên **trang Facebook của họ** nên cần **Page Access Token dài hạn** riêng:
- Cần quyền: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
- Lấy qua Graph API Explorer / System User token (anh hoặc kỹ thuật làm hộ 1 lần).
- Gửi cho học viên **2 dòng**: `FB PAGE ID` và `FB PAGE TOKEN`.
- Token hết hạn ~60 ngày → tới hạn gửi token mới, học viên dán lại vào `config.local.json` (mục D trong hướng dẫn học viên).

## 4. Gửi cho học viên
- Nén thư mục `ban-chuyen-giao` (đã điền `_app.json`) thành `.zip`.
- Kèm 3 thông tin: **Link Base mẫu**, **FB PAGE ID**, **FB PAGE TOKEN** của học viên đó.
- Bảo học viên đọc `HUONG-DAN-HOC-VIEN.md`.

## 5. Điều kiện máy học viên
- Windows 10/11, có quyền cài phần mềm (Node).
- Máy **bật khi tới giờ đăng** (task chạy ẩn 2 phút/lần; không cần đăng nhập màn hình nhưng máy phải mở).

## Giới hạn đã biết
- Đây là phương án **quét ẩn** (máy ngó Base mỗi 2 phút, chạy ngầm không hiện cửa sổ). Phương án "Lark đẩy tín hiệu" (event-driven) bị timeout khi tạo automation qua API trên base lớn — nếu cần, tạo automation thủ công trong Base UI.
- Mỗi học viên 1 máy + 1 Base + 1 token riêng. Không dùng chung token giữa các page khác nhau.
