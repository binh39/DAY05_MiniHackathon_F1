# Báo cáo Reflection Cá nhân — Phạm Đình Minh

- **Họ và tên:** Phạm Đình Minh
- **Mã học viên:** 2A202601979
- **Vai trò trong nhóm:** Frontend / Demo & UX Engineer
- **Thư mục/Artifacts phụ trách chính:** `codebase/frontend/`, `demo-slides.html`, UI components, Remotion visual templates, Source Navigation Player.

---

## 1. Phần công việc cá nhân đã thực hiện

1. **Xây dựng Giao diện Web App (React / Vite / TailwindCSS):**
   - Xây dựng giao diện trang VLearn Video Summarizer gồm 3 màn hình chính: Upload PDF & Cấu hình → Màn hình Duyệt Outline (`AWAITING_APPROVAL`) → Màn hình Video Player & Traceability.
2. **Thiết kế Trình phát Video Tương tác kèm Trang Nguồn (Source Traceability Player):**
   - Phát triển component Video Player cho phép học viên xem theo Chapter, tự động đồng bộ vị trí video với danh sách Chapter bên cạnh.
   - Khi người học bấm vào bất kỳ Chapter hoặc nút "Xem trang nguồn", player sẽ mở ngay lập tức ảnh chụp trang slide PDF tương ứng ở khu vực bên dưới.
3. **Áp dụng Nguyên tắc HAX/PAIR vào Giao diện:**
   - Thực thi các nguyên tắc G1 (Làm rõ khả năng), G2 (Hiện cảnh báo OCR mờ), G8/G9 (Cho sửa/xóa Chapter ở bước Outline), G11 (Trích dẫn `source_id`), G15 (Form thu thập feedback).
4. **Soạn thảo Slide Demo 6 Trang:**
   - Tạo file [`demo-slides.html`](../demo-slides.html) dạng HTML tương tác cao cấp (có thể render PDF) phục vụ vòng thuyết trình Demo 5 phút tại CP6.

---

## 2. Công cụ AI đã hỗ trợ như thế nào

- **Vibe-coding UI Components:** Sử dụng TailwindCSS kết hợp AI code gen để tạo giao diện hiện đại, glassmorphism rực rỡ, hỗ trợ responsive mượt mà và animation chuyển slide ấn tượng.
- **Tự động hóa HTML Slide Generation:** Dùng AI hỗ trợ viết CSS variables, Flexbox/Grid layout cho bộ slide 6 trang để hiển thị đẹp mắt trên màn hình máy chiếu hackathon.
- **Vibe-coding Compliance:** Tôi nắm rõ toàn bộ luồng state management ở Frontend (React hooks, useState, useEffect), cách gọi API tới Backend để fetch thông tin Job và xử lý sự kiện khi user click duyệt Outline.

---

## 3. Bài học từ case thất bại (Case Fail của chính nhóm)

- **Trường hợp thất bại:** Lỗi giao diện bị treo khi hiển thị trang PDF gốc quá lớn (PDF 80 trang làm đơ trình duyệt).
- **Phân tích nguyên nhân:** Ở bản thử nghiệm đầu tiên, tôi đã cố gắng nạp toàn bộ 80 ảnh trang PDF vào DOM cùng một lúc để khi user click chapter nào thì scroll ngay đến trang đó. Điều này khiến trình duyệt bị quá tải bộ nhớ (DOM size quá lớn) dẫn đến giật lag khi chuyển chapter.
- **Sửa chữa & Bài học:** Tôi đã thay đổi giải pháp sang **Lazy Loading & Dynamic Rendering**. Frontend chỉ nạp ảnh của trang PDF tương ứng với Chapter đang được click chọn (`activeSourcePage`). Bài học rút ra: **Giao diện AI sản phẩm phải ưu tiên trải nghiệm phản hồi tức thì (Responsiveness), không ôm đồm nạp toàn bộ dữ liệu nặng vào UI khi chưa cần thiết.**

---

## 4. Cam kết Vibe-coding Rule

Tôi khẳng định hoàn toàn giải thích được mọi đoạn code React Component trong `codebase/frontend/src`, luồng chuyển đổi giao diện giữa các bước trong Pipeline, và cách thức vận hành bộ Slide Demo tại `demo-slides.html`.
