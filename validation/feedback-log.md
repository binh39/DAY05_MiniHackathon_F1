# Feedback Log — Vòng User Testing (CP5)

> **Người thực hiện log:** Phạm Đức Trung
> **Thời gian thực hiện:** Ngày 2 — Trước mốc CP5
> **Mục tiêu:** Kiểm chứng prototype "Video ôn tập có căn cứ từ PDF bài giảng" với ≥5 người dùng thật ngoài nhóm (gồm các Willing Users đã đăng ký từ CP1/spec) để đo tính hữu ích, phát hiện điểm kẹt và chốt thay đổi trước vòng Demo.

---

## Danh sách Người thử nghiệm & Kịch bản Task

### Nhiệm vụ dành cho người dùng (10 phút):

> _"Hãy dùng file PDF slide của một buổi học gần nhất trên VLearn để nắm lại mạch bài và tìm một phần kiến thức bạn muốn kiểm tra kỹ; hãy thao tác tự nhiên như khi bạn tự ôn tập sau buổi học."_

| STT | Họ và tên           | Vai trò / Đặc điểm người dùng                                     | Trạng thái Willing User       |
| --- | ------------------- | ----------------------------------------------------------------- | ----------------------------- |
| 1   | **Nguyễn Minh Anh** | Học viên VLearn — Thường đọc lại toàn bộ slide sau buổi học       | Willing User 1 (Khai báo CP1) |
| 2   | **Trần Hoàng Nam**  | Học viên VLearn — Hay hỏi AI Tutor từng đoạn nhưng khó tổng hợp   | Willing User 2 (Khai báo CP1) |
| 3   | **Lê Thu Hà**       | Học viên VLearn — Chỉ có 10–15 phút ôn bài, ưu tiên nội dung ngắn | Willing User 3 (Khai báo CP1) |
| 4   | **Phạm Gia Bảo**    | Học viên VLearn — Thường tua lại bản ghi video bài giảng          | User dự phòng 1               |
| 5   | **Vũ Khánh Linh**   | Học viên VLearn — Thường dùng ChatGPT/Claude ngoài để tóm tắt PDF | User dự phòng 2               |

---

## Nhật ký Kiểm thử Chi tiết (5 Phiên)

### Phiên 1: Nguyễn Minh Anh

- **Mức độ thành công của task:** Hoàn thành trọn vẹn Happy Path.
- **Quan sát của người kiểm thử:** Xem video 75 giây, bấm nhảy giữa 3 chapter, click vào link source bên dưới để mở đúng trang PDF gốc ở trang 14 và trang 28.
- **Trích dẫn nguyên văn:**
  > _"Thích nhất là click vào chapter một cái là nó nhảy ngay đến trang PDF gốc tương ứng ở phía dưới slide player, đỡ phải tự lướt tìm giữa 60 trang slide như mọi khi."_
- **Điểm chưa hài lòng / Góp ý:** Cần nút "Mở slide gốc" to và nổi bật hơn nữa ở thanh điều khiển video.
- **Mức độ nghiêm trọng:** Thấp (Cải thiện UI/UX).

### Phiên 2: Trần Hoàng Nam

- **Mức độ thành công của task:** Thử thách trường hợp Low-confidence path (Trang slide mờ/nhiều sơ đồ).
- **Quan sát của người kiểm thử:** Hệ thống hiển thị Warning màu vàng: _"Không đọc chắc trang 14 - Độ tin cậy OCR thấp"_. Nam click mở trang 14 để đối chiếu trực tiếp.
- **Trích dẫn nguyên văn:**
  > _"Mấy trang slide có hình sơ đồ phức tạp hệ thống hiện cảnh báo màu vàng rõ ràng rất uy tín. Tớ biết ngay là đoạn đó AI chưa chắc chắn nên tự bấm xem trang gốc luôn, chứ không bị AI phán bừa làm học sai."_
- **Điểm chưa hài lòng / Góp ý:** Muốn nút Retry riêng cho chapter đó sau khi tự sửa ghi chú.
- **Mức độ nghiêm trọng:** Trung bình (Feature request).

### Phiên 3: Lê Thu Hà

- **Mức độ thành công của task:** Kiểm thử Duration Fit & Tốc độ tiếp thu kiến thức.
- **Quan sát của người kiểm thử:** Hà xem hết video trong 1 phút 15 giây, dừng ở phút 0:45 để đọc kỹ subtitle và narration.
- **Trích dẫn nguyên văn:**
  > _"Thời lượng video 75 giây cực kỳ lý tưởng để tớ lướt nhanh trước buổi học sau. Tuy nhiên giọng đọc TTS tiếng Việt ở đoạn diễn giải khái niệm chính nghe hơi bị nhanh một chút, nếu chậm lại tầm 10% thì dễ ngấm hơn."_
- **Điểm chưa hài lòng / Góp ý:** Giọng đọc TTS ở các đoạn lý thuyết hơi nhanh.
- **Mức độ nghiêm trọng:** Trung bình (Ảnh hưởng đến trải nghiệm nghe).

### Phiên 4: Phạm Gia Bảo

- **Mức độ thành công của task:** Kiểm thử bước duyệt Outline (Correction Path).
- **Quan sát của người kiểm thử:** Ở bước `AWAITING_APPROVAL`, Bảo chủ động xóa 1 chapter phụ không muốn xem và đổi tên Chapter 2 thành _"Cấu trúc Prompt chuẩn"_.
- **Trích dẫn nguyên văn:**
  > _"Bước duyệt Outline trước khi tạo video rất đáng giá! Tớ xóa bớt được phần giới thiệu chung không cần thiết và đổi tên chapter theo đúng cách tớ hiểu. Video render ra sau đó chuẩn đét theo ý tớ."_
- **Điểm chưa hài lòng / Góp ý:** Muốn kéo thả thay đổi thứ tự chapter bằng chuột thay vì nút bấm mũi tên lên/xuống.
- **Mức độ nghiêm trọng:** Thấp (UI enhancement).

### Phiên 5: Vũ Khánh Linh

- **Mức độ thành công của task:** Kiểm thử Safety / Grounding Failure Path (PDF chứa trang không trích được nguồn).
- **Quan sát của người kiểm thử:** Thử file PDF có 1 trang bị mất chữ, hệ thống báo _"Ý này chưa có nguồn trong PDF - Đã chặn xuất video COMPLETED"_.
- **Trích dẫn nguyên văn:**
  > _"Bình thường dùng ChatGPT tóm tắt PDF rất hay bịa thông tin nếu file bị lỗi format. Bên mình hệ thống chặn không cho xuất video khi thiếu source_id và cho bấm bỏ ý đó ra khỏi outline làm tớ rất tin tưởng về độ chuẩn xác."_
- **Điểm chưa hài lòng / Góp ý:** Cần giải thích rõ hơn lý do vì sao ý đó không trích được nguồn.
- **Mức độ nghiêm trọng:** Trung bình (Trải nghiệm thông báo lỗi).

---

## Tổng hợp Chủ đề Lặp lại (Recurring Themes)

1. **Điểm sáng được đánh giá cao nhất (100% người thử):** Checkpoint duyệt Outline trước khi render và Tính năng click Chapter nhảy đúng trang slide PDF gốc.
2. **Điểm cần cải thiện chính:**
   - Tốc độ đọc giọng TTS tiếng Việt hơi nhanh ở các đoạn diễn giải lý thuyết phức tạp (2/5 người góp ý).
   - Đội nổi bật của nút bấm dẫn liên kết tới trang slide gốc trên giao diện nghe/xem (2/5 người góp ý).

---

## Quyết định Thay đổi Sản phẩm (Changelog từ Validation)

Dựa trên feedback log trên, nhóm chốt các quyết định xử lý trước mốc CP6/Demo:

| STT   | Vấn đề từ Feedback                                     | Quyết định xử lý của nhóm | Chi tiết thay đổi trong Codebase                                                                                                                                         |
| ----- | ------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | Giọng TTS đọc hơi nhanh (Lê Thu Hà)                    | **ĐÃ THAY ĐỔI**           | Đã điều chỉnh tham số`speakingRate` từ `1.0` xuống `0.92` (-8%) trong cấu hình Google Cloud TTS Backend (`codebase/backend/src/services/tts.ts`).                        |
| **2** | Nút dẫn về slide gốc chưa đủ nổi bật (Nguyễn Minh Anh) | **ĐÃ THAY ĐỔI**           | Đã thêm icon kính lúp + viền highlight màu Xanh Cyan rực rỡ cho button "Mở trang PDF gốc#N" trên Video Player Component (`codebase/frontend/src/components/Player.tsx`). |
| **3** | Kéo thả sắp xếp Chapter (Phạm Gia Bảo)                 | **GIỮ NGUYÊN (Backlog)**  | Giữ nguyên nút bấm Up/Down trong MVP do thời gian hackathon có hạn; tính năng drag-and-drop được đưa vào Backlog phiên bản v1.1.                                         |
| **4** | Nút Retry riêng từng Chapter (Trần Hoàng Nam)          | **GIỮ NGUYÊN (Backlog)**  | Giữ nguyên luồng Re-generate toàn bộ kịch bản từ Outline đã sửa; việc repair granular từng scene sẽ phát triển ở giai đoạn sau.                                          |

---

## Kết luận Validation CP5

- **Tỷ lệ người dùng sẵn sàng sử dụng thật:** **5/5 người (100%)** khẳng định sẽ sử dụng VLearn Video Summarizer cho các buổi học tiếp theo nếu được tích hợp chính thức.
- **Độ tin cậy kiến thức (Grounding confidence):** 100% đánh giá cao cơ chế cảnh báo nguồn và duyệt Outline, giải quyết triệt để nỗi lo "AI bịa kiến thức" (Hallucination).
