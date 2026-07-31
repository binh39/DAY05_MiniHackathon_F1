# Báo cáo Reflection Cá nhân — Phạm Đức Trung

- **Họ và tên:** Phạm Đức Trung
- **Mã học viên:** 2A202601253
- **Vai trò trong nhóm:** Product / Validation
- **Thư mục/Artifacts phụ trách chính:** `validation/feedback-log.md`, Tổ chức User Testing CP5, Tổng hợp Willing Users, Phân tích phản hồi & Lập Changelog.

---

## 1. Phần công việc cá nhân đã thực hiện

1. **Quản lý & Kết nối Willing Users:**
   - Tuyển chọn và liên hệ 5 người dùng thử nghiệm ngoài nhóm (gồm 3 Willing Users đã đăng ký từ CP1: Nguyễn Minh Anh, Trần Hoàng Nam, Lê Thu Hà; cùng 2 người dùng dự phòng: Phạm Gia Bảo, Vũ Khánh Linh).
2. **Tổ chức các phiên User Testing (CP5):**
   - Soạn thảo kịch bản test 10 phút, đặt câu hỏi quan sát không dẫn dắt và 3 câu hỏi phỏng vấn sâu sau khi thao tác.
   - Ghi chép nhật ký kiểm thử chi tiết tại file [`validation/feedback-log.md`](../validation/feedback-log.md) với 100% trích dẫn nguyên văn câu nói của người dùng.
3. **Phân tích Feedback & Đề xuất Thay đổi Sản phẩm (Changelog):**
   - Phân loại các nhóm góp ý theo chủ đề lặp lại (Recurring Themes), đánh giá mức độ nghiêm trọng.
   - Làm việc với Backend & Frontend Lead để thực thi ngay 2 thay đổi quan trọng trước Demo: Đọc TTS chậm lại 8% và Thêm viền Highlight rực rỡ cho nút liên kết slide gốc.

---

## 2. Công cụ AI đã hỗ trợ như thế nào

- **Phân tích Định tính Phản hồi Người dùng (Qualitative Feedback Analysis):** Dùng AI để hỗ trợ cụm nhóm (clustering) các đoạn trích dẫn của 5 người dùng thành các bài học UX chính, phát hiện các điểm nghẽn trong luồng thao tác mà người dùng không tự nói ra.
- **Soạn thảo Khung Phỏng vấn:** Dùng LLM hỗ trợ tạo danh sách câu hỏi phỏng vấn trung tính (unbiased user interview framework) nhằm tránh hiện tượng người được hỏi khen xã giao.
- **Vibe-coding Compliance:** Tôi nắm rõ từng dòng phản hồi trong `validation/feedback-log.md`, lý do chấp nhận/từ chối từng góp ý của người dùng, cũng như phương pháp đo lường chỉ số sẵn sàng sử dụng (Willingness to try).

---

## 3. Bài học từ case thất bại (Case Fail của chính nhóm)

- **Trường hợp thất bại:** Việc thiếu câu hỏi kiểm tra khả năng phát hiện lỗi AI bịa (Hallucination Detection) trong phiên test thử đầu tiên.
- **Phân tích nguyên nhân:** Trong phiên chạy thử nghiệm nội bộ trước CP5, tôi chỉ tập trung hỏi người dùng xem _"Video có đẹp không?", "Nhạc nền có hay không?"_. Kết quả là thu được những lời khen chung chung không có giá trị cho spec.
- **Sửa chữa & Bài học:** Ngay sau đó tôi đã thay đổi toàn bộ bộ câu hỏi theo đúng hướng dẫn của thầy: _"Kết quả này bạn có tin không — vì sao?", "Khi hệ thống báo warning màu vàng ở trang 14, bạn sẽ làm gì tiếp theo?"_. Nhờ vậy, nhóm mới phát hiện ra rằng **yếu tố giúp người dùng tin tưởng nhất chính là tính năng cho phép đối chiếu trang slide PDF gốc chứ không phải giao diện bóng bẩy.**

---

## 4. Cam kết Vibe-coding Rule

Tôi chịu trách nhiệm bảo vệ toàn bộ dữ liệu trong `validation/feedback-log.md`, giải thích lý do vì sao nhóm đưa ra các quyết định thay đổi trong Changelog và sẵn sàng trả lời các câu hỏi về trải nghiệm người dùng của Giám khảo tại CP5/CP6.
