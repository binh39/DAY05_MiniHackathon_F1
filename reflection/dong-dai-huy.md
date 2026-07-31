# Báo cáo Reflection Cá nhân — Đồng Đại Huy

- **Họ và tên:** Đồng Đại Huy
- **Mã học viên:** 2A202601901
- **Vai trò trong nhóm:** Spec & Evidence
- **Thư mục/Artifacts phụ trách chính:** `spec.md`, `evidence/mining-log.md`, JTBD Analysis, Problem Statement & Impact Matrix.

---

## 1. Phần công việc cá nhân đã thực hiện

1. **Khảo sát Pain & Mining Data:**
   - Trực tiếp chạy phân tích 2.522 message (1.261 lượt tương tác học viên - tutor) từ dữ liệu ẩn danh của khóa học, xây dựng regex rule đếm 141 yêu cầu tóm tắt và 49 trường hợp bị từ chối (refusal).
   - Thiết lập file [`evidence/mining-log.md`](../evidence/mining-log.md) với mã đếm SHA-256 có thể kiểm tra lại được.
2. **Xây dựng Spec & Khung thiết kế AI:**
   - Viết toàn bộ tài liệu [`spec.md`](../spec.md) từ §1 đến §9 theo đúng chuẩn template `03-template-ai-spec.md`.
   - Định hình Lát cắt MỘT CÂU, 6 Non-goals, phân tích 4 lớp chỗ khó R1–R12 và áp dụng 8 nguyên tắc HAX/PAIR vào giao diện & luồng xử lý của hệ thống.
3. **Phân tích đối thủ & Lựa chọn giải pháp:**
   - Tiến hành desk research 4 sản phẩm tương tự (NotebookLM, Google Vids, Synthesia, Canva Video) trong `brainstorm3.md` để chốt điểm khác biệt cốt lõi: **Checkpoint duyệt Outline + Source Traceability 100% đến từng trang PDF gốc**.

---

## 2. Công cụ AI đã hỗ trợ như thế nào

- **Prompting & Spec Drafting:** Sử dụng Claude 3.5 Sonnet / Gemini 1.5 Pro để hỗ trợ cô đọng văn bản, chuyển đổi các quan sát hỗn loạn từ khảo sát thành câu Core JTBD & Problem Statement chuẩn mực mà không dùng từ "AI" trong phát biểu bài toán.
- **Mining Log Scripting:** Dùng AI hỗ trợ viết script Python / Node.js để parse chatlog JSONL, lọc các turn chứa từ khóa `tóm tắt|tổng hợp`, kiểm tra sự hiện diện của citation và tính toán tỷ lệ % thất bại của tutor cũ.
- **Vibe-coding Compliance:** Tôi nắm rõ và giải thích được toàn bộ cấu trúc logic trong `spec.md`, các công thức tính toán trong bảng Impact (§2), lý do chọn phương án A2 thay vì A1/A3/A4, cũng như lý do thiết lập Quality Bar ở mức 90%.

---

## 3. Bài học từ case thất bại (Case Fail của chính nhóm)

- **Trường hợp thất bại:** Case `G15` trong đợt kiểm thử lượt 1 (`eval/run-01-2026-07-30.md`).
- **Hiện tượng:** Bộ ước tính thời lượng (Duration Estimator) dự đoán thời lượng video là 1.634 giây, nhưng khi sinh ra file âm thanh WAV thật từ Google Cloud TTS thì thời lượng thực tế chỉ là 902,56 giây (sai lệch tới **-44,8%**).
- **Phân tích nguyên nhân:** Ban đầu tôi và nhóm chủ quan nghĩ rằng có thể ước tính thời lượng video dựa trên công thức đơn giản: `Số từ trong script * 0.4 giây/từ`. Nối suy nghĩ này đã thất bại vì TTS có các khoảng ngắt nghỉ (pause), ngắt câu và tốc độ đọc biến thiên tùy theo từ ngữ tiếng Việt.
- **Bài học rút ra:** Trong sản phẩm AI đa phương tiện (Multimodal), không được dùng các giả định sơ khai (heuristics) để thay thế cho kiểm tra thực tế. Chúng tôi đã khắc phục bằng cách đưa vào **Final Duration Gate** và lấy thời lượng file WAV audio thật từ TTS làm mốc chuẩn cho Remotion Timeline thay vì tin vào con số ước tính ban đầu.

---

## 4. Cam kết Vibe-coding Rule

Tôi xác nhận có thể trình bày, giải thích và trả lời mọi câu hỏi phản biện của Giám khảo/TA liên quan đến toàn bộ nội dung trong `spec.md` và `evidence/mining-log.md`.
