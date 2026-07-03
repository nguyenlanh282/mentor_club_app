# Hướng dẫn dùng — Tự động đăng Video Reel lên Facebook

> Làm 1 lần là chạy mãi. Sau khi cài, mỗi lần muốn đăng video bạn chỉ thao tác trên Lark Base.

---

## A. Cài đặt (làm 1 lần, ~10 phút)

Bạn sẽ nhận từ người hướng dẫn **3 thứ**:
1. **Thư mục cài đặt** (giải nén ra Desktop).
2. **FB PAGE ID** + **FB PAGE TOKEN** (mã đăng bài lên trang của bạn — người hướng dẫn lấy hộ).
3. **Link Base mẫu** để nhân bản.

### Bước 1 — Nhân bản Base mẫu
- Mở **Link Base mẫu** người hướng dẫn gửi.
- Góc trên phải bấm **... → Tạo bản sao (Make a copy)**.
- Đặt tên tuỳ ý → đây là Base của riêng bạn.
- Mở Base vừa sao, **copy đường link trên trình duyệt** (dạng `https://....larksuite.com/base/xxxx?table=tblyyyy`). Lát nữa dán vào trình cài đặt.

### Bước 2 — Chạy trình cài đặt
- Mở thư mục cài đặt → bấm đúp **`CAI-DAT.bat`**.
- (Nếu Windows cảnh báo SmartScreen → bấm **More info → Run anyway**.)
- Làm theo trên màn hình:
  1. Máy tự cài Node + lark-cli (chờ chút).
  2. Hiện **link đăng nhập Lark** → mở trình duyệt → **đăng nhập Lark của bạn → Đồng ý**.
  3. **Dán link Base** (ở Bước 1).
  4. **Dán FB PAGE ID** và **FB PAGE TOKEN** (người hướng dẫn gửi).
- Thấy dòng **HOAN TAT!** là xong. Máy đã tự động chạy ngầm.

---

## B. Cách đăng video (mỗi ngày)

Trong **Base của bạn**, mở 1 dòng và điền:

| Cột | Điền gì |
|---|---|
| **Ảnh/video** | Kéo video vào (MP4, dọc 9:16, dài 3–90 giây) |
| **Nội dung** | Lời caption cho bài |
| **Hastag** | Hashtag (nếu muốn) |
| **Lịch đăng** | Chọn ngày giờ muốn lên bài (để trống = đăng luôn) |
| **TT Reel** | Chọn **`Chờ đăng`** ← đây là nút "bắt đầu" |

Xong! Trong ~2 phút (hoặc đúng giờ đã hẹn), máy tự đăng lên Facebook và:
- Đổi **TT Reel → `Đã đăng`**, điền **Link Reel** (link bài).
- Nếu lỗi → **TT Reel → `Lỗi`**, lý do ghi ở cột **Log đăng Reel**.

> Máy của bạn **phải đang mở** (không cần đăng nhập màn hình, chỉ cần máy bật) thì mới đăng được đúng giờ.

---

## C. Gặp trục trặc?

| Hiện tượng | Cách xử lý |
|---|---|
| Cột **TT Reel** ra **Lỗi**, Log ghi "OAuthException / token" | Token Facebook hết hạn (~60 ngày). Báo người hướng dẫn lấy token mới, dán lại (xem mục D). |
| Báo lỗi định dạng/độ dài video | Cắt video còn 3–90 giây, xuất MP4 dọc, đăng lại. |
| Để **Chờ đăng** mà không lên | Kiểm tra đã tới **Lịch đăng** chưa; máy có đang bật không. |
| Muốn đăng lại 1 bài | Đặt lại **TT Reel = Chờ đăng**. |

## D. Khi cần đổi token Facebook
Mở thư mục cài đặt → mở file **`config.local.json`** bằng Notepad → thay giá trị trong `"FB_PAGE_TOKEN": "..."` bằng token mới người hướng dẫn gửi → lưu lại. Xong.

---
*Mọi việc còn lại máy tự lo. Bạn chỉ cần: video + Nội dung + Chờ đăng.*
