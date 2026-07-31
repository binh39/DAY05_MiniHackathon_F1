# Báo cáo Reflection Cá nhân — Nguyễn Đình Bình

- **Họ và tên:** Nguyễn Đình Bình
- **Mã học viên:** 2A202601091
- **Vai trò trong nhóm:** Backend / AI Pipeline Engineer
- **Phạm vi phụ trách chính:** Kiến trúc pipeline PDF-to-video, contract giữa các module, backend API, xử lý job, tích hợp Google Cloud và triển khai production.
- **Thư mục/Artifacts phụ trách:** `codebase/backend/src/core/`, `src/modules/`, `src/pipeline/`, `src/providers/`, `src/server/`, `tests/`, `Dockerfile` và cấu hình triển khai Firebase/Google Cloud.

---

## 1. Phần công việc cá nhân đã thực hiện

### 1.1. Xây dựng kiến trúc pipeline bằng Node.js/TypeScript

Tôi tham gia xây dựng pipeline chuyển đổi một file PDF thành video bài giảng theo luồng:

1. **Module 1 — Document Intelligence:** kiểm tra PDF, tính checksum, render từng trang thành ảnh/thumbnail, dùng Gemini multimodal để nhận diện page, section, concept và Source Registry.
2. **Module 2 — Lecture Planner:** chia chapter, xác định learning objective, phân bổ thời lượng và lập Coverage Manifest theo page và `source_id`.
3. Pipeline dừng tại trạng thái **`AWAITING_APPROVAL`** để người dùng xem, chỉnh sửa và duyệt outline.
4. **Module 3 — Script Generator:** sinh lời giảng có grounding, learning check và pronunciation glossary.
5. **Module 4 — Storyboard Generator:** chuyển từng narration thành scene và chọn một visual template cố định.
6. **Module 5A — Visual Generator** và **Module 5B — Voice Generator** chạy song song để tạo hình ảnh bằng Remotion và âm thanh bằng Google Cloud Text-to-Speech.
7. **Module 6 — Video Composer:** dùng duration WAV thực tế để dựng timeline, tạo SRT, coverage report và ghép video H.264/AAC bằng FFmpeg.

Mỗi module tạo một artifact riêng như `01_document.json`, `02_lecture_plan.json`, `03_script.json`, `04_storyboard.json`, `05a_visual_manifest.json`, `05b_voice_manifest.json` và `06_video_manifest.json`.

### 1.2. Tích hợp AI và Google Cloud

- Tích hợp Gemini trên Vertex AI thông qua Application Default Credentials. Production hiện cấu hình Gemini 3.5 Flash cho Document Intelligence, Lecture Planner, Script Generator, Storyboard Generator và Summary Generator.
- Tích hợp Google Cloud Text-to-Speech để tạo audio theo từng scene, hỗ trợ tiếng Việt và tiếng Anh.
- Sử dụng SSML để escape XML, thêm khoảng nghỉ, xử lý pronunciation glossary và loại citation kỹ thuật khỏi lời đọc.
- Tích hợp Firebase Authentication để xác thực người dùng bằng ID token.
- Dùng Firestore làm nguồn dữ liệu chính cho metadata, trạng thái, progress và lỗi của job.
- Dùng Firebase Storage/Cloud Storage để lưu PDF, artifact JSON, ảnh trang, visual, WAV và MP4.
- Dùng Cloud Run Service cho Fastify API và Cloud Run Job cho worker xử lý pipeline nặng.

### 1.3. Xây dựng contract, validation và khả năng phục hồi

- Xây dựng Zod contract cho đầu vào/đầu ra của từng module.
- Mọi grounded claim quan trọng phải truy ngược được về `source_id`, không chỉ về số trang.
- Kiểm tra coverage theo cả page và source.
- Kiểm tra source hợp lệ, learning objective coverage, contradiction, narration duration và trạng thái visual/voice.
- Bổ sung checksum, cache và retry theo module.
- Cho phép retry từ module lỗi; riêng lỗi thời lượng sẽ quay lại Module 3 và bỏ qua generation cache cũ.
- Đồng bộ artifact lên Cloud Storage sau khi module hoàn tất.
- Sửa cơ chế cache local của Cloud Run API: nếu thư mục local thiếu artifact bắt buộc thì backend tải lại bản mới từ Cloud Storage.

### 1.4. Backend API và triển khai production

- Xây dựng API bằng Fastify, sử dụng multipart upload, CORS và rate limit.
- Thực hiện các luồng upload PDF, tạo video, xem/duyệt outline, retry, xem kết quả, tóm tắt và xóa dữ liệu.
- Kiểm tra quyền sở hữu job theo Firebase `owner_uid`.
- Docker hóa backend với Node.js 22, Chromium, Remotion, FFmpeg/FFprobe và font Noto hỗ trợ tiếng Việt.
- Triển khai frontend trên Firebase Hosting.
- Triển khai Fastify API trên Cloud Run Service và pipeline worker trên Cloud Run Job tại `asia-southeast1`.
- Kiểm tra production bằng health check, Firebase Auth, protected API và public UI smoke test.

---

## 2. Công cụ AI đã hỗ trợ như thế nào

Tôi sử dụng Codex như một công cụ hỗ trợ trong quá trình phát triển để:

- phân tích kiến trúc và chia trách nhiệm giữa các module;
- tạo boilerplate TypeScript, Fastify route và Zod schema;
- hỗ trợ xây dựng prompt/structured output cho Gemini;
- phân tích log từ Cloud Run, Vertex AI, TTS và FFmpeg;
- tìm nguyên nhân lỗi duration, cache artifact và trạng thái retry;
- hỗ trợ viết unit test, regression test, Dockerfile và quy trình triển khai;
- rà soát giao diện, backend và kết nối Firebase/Google Cloud.

Tôi không xem output của AI là kết quả đúng mặc định. Các thay đổi được kiểm tra lại bằng TypeScript build, unit test, integration test, Docker build, Cloud Run health check và smoke test trên domain public. Sau lần merge gần nhất, backend đạt **73/73 test** và public UI smoke test thành công.

Qua quá trình này, tôi có thể giải thích:

- artifact contract giữa các module;
- cách grounding bằng `source_id`;
- cách Module 5A và 5B chạy song song;
- cách Module 6 dựng timeline từ duration WAV thực tế;
- state transition và retry của job;
- cách Firestore, Cloud Storage, Cloud Run Service và Cloud Run Job phối hợp.

---

## 3. Bài học từ case thất bại của nhóm

### Trường hợp thất bại

Khi người dùng chọn video trong khoảng **3–5 phút**, một số lần chạy tạo audio chỉ dài khoảng **129–133 giây**. Module 6 báo lỗi `DURATION_OUT_OF_RANGE` vì audio thực tế ngắn hơn nhiều so với khoảng 180–300 giây. Việc nhấn tiếp tục từ module lỗi ban đầu vẫn lặp lại lỗi do pipeline tái sử dụng script/cache cũ.

### Nguyên nhân

- Word budget ban đầu chưa phản ánh đúng tốc độ thực tế của Google Cloud TTS tiếng Việt.
- Duration plan ở Module 2, lượng narration ở Module 3 và audio thực tế ở Module 5B chưa dùng cùng một giả định.
- Module 6 là nơi đầu tiên phát hiện sai lệch lớn, nhưng lúc đó việc chỉ chạy lại bước ghép video không thể bổ sung nội dung còn thiếu.
- Retry chưa quay về đúng module tạo ra nguyên nhân gốc và vẫn có thể dùng generation cache cũ.

### Cách sửa

- Hiệu chỉnh narration budget tiếng Việt theo tốc độ TTS đo được, khoảng 210 từ/phút.
- Module 3 ước lượng toàn chapter thay vì cộng dồn sai số làm tròn của từng scene.
- Module 5B đo duration thật từ WAV và có thể tái tổng hợp với speaking rate phù hợp.
- Module 6 sử dụng duration thật để dựng timeline và chỉ hiệu chỉnh audio tempo trong ngưỡng an toàn.
- Nếu lệch quá lớn, retry quay lại Module 3, reset Module 3–6 và bỏ qua cache generation cũ.
- Validator cho phép sai số nhỏ hợp lý nhưng vẫn giữ cổng chặn cuối để video không nằm ngoài option thời lượng người dùng chọn.

### Bài học rút ra

Trong hệ thống AI tạo media, duration không thể chỉ dựa vào số từ hoặc thời lượng lý thuyết. Pipeline phải:

1. dùng chung một duration contract từ bước lập kế hoạch;
2. đo file audio thực tế;
3. chỉ hiệu chỉnh tốc độ trong giới hạn an toàn;
4. retry từ module tạo ra nguyên nhân gốc;
5. không tái sử dụng cache khi input logic đã thay đổi.

---

## 4. Cam kết Vibe-coding Rule

Tôi có thể giải thích toàn bộ luồng chính của `codebase/backend/src`, bao gồm:

- trạng thái job: `QUEUED → RUNNING → AWAITING_APPROVAL → QUEUED → RUNNING → COMPLETED`;
- các trạng thái ngoại lệ `FAILED` và `CANCELLED`;
- trạng thái riêng của từng module: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`;
- cách frontend gửi Firebase ID token đến Fastify API;
- cách API lưu metadata vào Firestore, PDF/artifact vào Cloud Storage và kích hoạt Cloud Run Job;
- cách worker tải dữ liệu, chạy pipeline trong filesystem tạm, cập nhật progress và upload artifact;
- cách xử lý lỗi Gemini, TTS, Remotion, FFmpeg, duration và stale artifact cache.

Tôi cam kết chỉ trình bày những phần có thể đối chiếu với code, test hoặc log thực tế; không xem nội dung do AI sinh ra là đúng nếu chưa được kiểm chứng.
