# Báo cáo Reflection Cá nhân — Nguyễn Quang Tường

* **Họ và tên:** Nguyễn Quang Tường  
* **Mã học viên:** 2A202601597  
* **Vai trò trong nhóm:** AI / Eval Engineer  
* **Thư mục/Artifacts phụ trách chính:** `eval/golden-set-v1.md`, `eval/run-01-2026-07-30.md`, Prompts & System Instructions cho LLM Modules.

---

## 1. Phần công việc cá nhân đã thực hiện
1. **Xây dựng Golden Set 20 Test Cases:**
   - Xây dựng tài liệu [`eval/golden-set-v1.md`](../eval/golden-set-v1.md) với đúng 20 case: 8 case thường (`G01–G08`), 8 case phủ 4 lớp chỗ khó R1–R12 (`G09–G16`), và 4 case hiếm (`G17–G20`).
   - Khai thác 10 case từ mã turn thật trong chatlog VLearn để đảm bảo tính thực tế của bộ kiểm thử.
2. **Thực thi Eval & Đo đạc Lượt 1:**
   - Tiến hành chạy tự động bộ kiểm thử lượt 1, lập báo cáo [`eval/run-01-2026-07-30.md`](../eval/run-01-2026-07-30.md).
   - Ghi nhận trung thực kết quả: **85,0% Pass Rate (17/20 PASS)**, chỉ rõ 1 FAIL (`G15`) và 2 NOT RUN (`G17`, `G18`) mà không che giấu hay tự sửa điểm.
3. **Tối ưu Prompt & Grounding Validator:**
   - Thiết kế System Prompt cho Module 1 & Module 3 ép LLM Gemini phải trích xuất đúng `source_id` tương ứng với từng trang slide PDF.
   - Viết Zod Schema để validate cấu trúc Output của LLM, tự động reject nếu phát hiện claim thiếu nguồn.

---

## 2. Công cụ AI đã hỗ trợ như thế nào
* **Prompt Engineering với Gemini 1.5 Flash/Pro:** Dùng AI để thử nghiệm các chiến thuật Few-shot Prompting và Structured Output (JSON Schema Mode) nhằm giảm thiểu hiện tượng Hallucination khi tóm tắt bài giảng.
* **Tự động hóa Eval Suite:** Sử dụng AI để hỗ trợ viết script runner tự động gửi từng test case trong Golden Set qua Pipeline Backend, thu thập output JSON và so sánh với Expected Result.
* **Vibe-coding Compliance:** Tôi làm chủ hoàn toàn các chỉ số đánh giá, cách phân loại P0/P1/P2 trong Golden Set, nguyên tắc hoạt động của Grounding Validator và lý do thiết lập Quality Bar ở mức 90%.

---

## 3. Bài học từ case thất bại (Case Fail của chính nhóm)
* **Trường hợp thất bại:** Sự cố 2 case `G17` (PDF mã hóa/hỏng) và `G18` (Prompt Injection) bị đánh dấu `NOT RUN` trong lượt kiểm thử đầu tiên.
* **Phân tích nguyên nhân:** Tôi đã trì hoãn việc chuẩn bị các file PDF fixture đặc thù (file bị đặt password mã hóa và file chứa câu prompt độc hại cố tình bảo AI bỏ qua quy tắc) vì nghĩ rằng các trường hợp này ít gặp. Khi đến giờ chốt baseline lượt 1, do thiếu file fixture nên không thể chạy automated test.
* **Sửa chữa & Bài học:** Theo đúng tinh thần của Rubric, tôi không được tự ý ghi PASS cho các case này bằng cách "đọc code thấy ổn". Tôi ghi nhận trung thực trạng thái `NOT RUN` và coi đó là điểm trừ 5% Pass rate. Bài học rút ra là: **Test Fixtures cho các case biên (Edge cases) phải được chuẩn bị song song ngay từ khi viết Golden Set, không được để đến cuối mới tạo.**

---

## 4. Cam kết Vibe-coding Rule
Tôi sẵn sàng giải thích chi tiết cấu trúc 20 test cases trong Golden Set, cơ chế bắt lỗi Prompt Injection trong Module 1 và logic chấm điểm tự động trong thư mục `eval/` khi Giám khảo hoặc TA yêu cầu.
