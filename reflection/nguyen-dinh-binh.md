# Báo cáo Reflection Cá nhân — Nguyễn Đình Bình

- **Họ và tên:** Nguyễn Đình Bình
- **Mã học viên:** 2A202601091
- **Vai trò trong nhóm:** Backend / Pipeline Engineer
- **Thư mục/Artifacts phụ trách chính:** `codebase/backend/` (`src/modules/`, `src/services/`, `src/validators/`, `package.json`, `tsconfig.json`).

---

## 1. Phần công việc cá nhân đã thực hiện

1. **Xây dựng Pipeline Architecture (Node.js/TypeScript):**
   - Thiết kế luồng xử lý 6 Module: Parse PDF/OCR (`Mod 1-2`) → Dừng chờ `AWAITING_APPROVAL` → Resume tạo Script (`Mod 3`) → Voice TTS (`Mod 4`) → Visual Remotion (`Mod 5`) → Compose FFmpeg MP4/SRT (`Mod 6`).
2. **Tích hợp LLM & Cloud Services:**
   - Kết nối Google Vertex AI (Gemini 1.5) để xử lý prompt tóm tắt có trích dẫn `source_id`.
   - Kết nối Google Cloud TTS API để sinh audio tiếng Việt với voice chuẩn.
   - Viết pipeline FFmpeg wrapper ghép file MP4 H.264, âm thanh AAC và file phụ đề SRT tự động.
3. **Hiện thực hóa Contract & State Guard:**
   - Xây dựng Zod Contract kiểm tra chặt chẽ đầu vào/đầu ra giữa từng Module. Nếu claim thiếu `source_id`, validator lập tức kích hoạt cơ chế repair hoặc reject chapter.

---

## 2. Công cụ AI đã hỗ trợ như thế nào

- **Vibe-coding & Express Pipeline Code Gen:** Sử dụng GitHub Copilot / Cursor AI để hỗ trợ gõ nhanh các boilerplate code cho Express routes, middleware kiểm tra Firebase Auth và các helper function thao tác với File System.
- **FFmpeg Command Generation:** Dùng LLM hỗ trợ viết các câu lệnh phức tạp của FFmpeg để ghép nhiều đoạn video scene, chèn subtitle SRT và encode chuẩn codec H.264 tương thích mọi trình duyệt web.
- **Vibe-coding Compliance:** Tôi nắm rõ 100% luồng chạy async/await của Backend, cơ chế lưu trữ state job trong Firestore, cách handle error khi LLM API bị rate limit hoặc timeout.

---

## 3. Bài học từ case thất bại (Case Fail của chính nhóm)

- **Trường hợp thất bại:** Lỗi lệch thời lượng giữa Video và Subtitle ở phiên bản thử nghiệm ban đầu (Tương ứng với rủi ro R10 trong Spec).
- **Phân tích nguyên nhân:** Ở bản dev đầu tiên, tôi gọi Google Cloud TTS sinh các file WAV riêng lẻ cho từng scene, sau đó dùng FFmpeg nối lại. Tuy nhiên, tôi đã không tính đến việc khoảng dừng (silence padding) giữa các scene khiến timestamp của file phụ đề SRT bị lệch tăng dần theo thời gian (drift error). Kết quả là đến cuối video, giọng nói và phụ đề lệch nhau tới 3 giây.
- **Sửa chữa & Bài học:** Tôi đã refactor lại `Module 4 & 6`, xây dựng `VoiceManifest` lưu trữ chính xác millisecond bắt đầu và kết thúc của từng câu nói dựa trên file WAV thực tế, sau đó dùng manifest này để dựng file SRT đồng bộ hoàn toàn. Bài học rút ra: **Trong xử lý Audio/Video, không bao giờ cộng dồn thời lượng lý thuyết mà phải lấy timestamp từ file media thực tế sau khi xuất (Media Integrity).**

---

## 4. Cam kết Vibe-coding Rule

Tôi khẳng định hoàn toàn giải thích được toàn bộ cấu trúc nguồn trong `codebase/backend/src`, luồng chuyển đổi trạng thái Job từ `PENDING` -> `AWAITING_APPROVAL` -> `PROCESSING` -> `COMPLETED`, cũng như cách xử lý ngoại lệ khi FFmpeg hoặc Gemini API gặp lỗi.
