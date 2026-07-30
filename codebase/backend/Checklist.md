# Checklist — AI Lecture Video

> Quy tắc: chỉ tick `[x]` khi task đạt Definition of Done trong `Tasks.md`.
> Không tick module chỉ vì đã có folder hoặc interface.
> Mục ghi **Partial** vẫn để `[ ]`; phần đã có được mô tả để không mất dấu tiến độ.

## Trạng thái audit — 2026-07-30

| Nhóm | Hoàn thành | Tổng |
|---|---:|---:|
| Product scope | 4 | 8 |
| Foundation | 13 | 16 |
| Module 1 | 21 | 30 |
| Module 2 | 21 | 22 |
| Module 3 | 24 | 25 |
| Module 4–6 | 70 | 74 |
| Backend + Web app | 25 | 27 |
| Evaluation | 2 | 14 |
| Security + Deployment | 8 | 22 |
| Milestones | 2 | 6 |
| **Tổng cộng** | **190** | **244** |

Có 11 task đang ở trạng thái **Partial**. Audit dựa trên code, 55 unit/integration
test, artifact thật của `Lecture-02-Process.pdf`, kiểm thử API/browser end-to-end
và các báo cáo trong `eval/`.
Chi tiết bằng chứng: `eval/checklist-audit-2026-07-30.md`.

Mặc dù pipeline kỹ thuật đã tạo được artifact Module 1–3, M1/M2 chưa được tick
vì milestone trong `Tasks.md` yêu cầu hoàn tất cả phase và golden set.

## A. Product scope

- [x] Chốt giới hạn 50 MB và tối đa 80 trang cho MVP.
- [x] Chốt MVP hỗ trợ PDF hợp lệ, không mã hóa.
- [x] Chốt output MP4, SRT và coverage report trong product contract.
- [x] Chốt định nghĩa `FULL`, `CONCISE`, `SUMMARY`; MVP chỉ cam kết `FULL`.
- [ ] Implement và test hành vi `CONCISE`, `SUMMARY`.
- [ ] Ghi rõ non-goals trên UI và README.
- [ ] Chuẩn bị đủ 5 golden PDF.
- [ ] Ghi expected result cho từng golden PDF.

## B. Foundation

- [x] Khởi tạo TypeScript strict project.
- [x] Tạo cấu trúc 6 giai đoạn/7 module folder.
- [x] Tạo Zod contract cho artifact giữa các module.
- [x] Tạo pipeline runner.
- [x] Cho Module 5A và 5B chạy song song.
- [x] Tạo CLI `inspect` và `run`.
- [x] Tạo config mẫu và `.env.example`.
- [x] Tạo artifact store theo run.
- [x] Typecheck thành công.
- [x] Test skeleton thành công.
- [ ] Tạo run manifest.
- [x] Tạo job state machine.
- [ ] Tạo error taxonomy.
- [ ] Thêm structured logging.
- [x] Thêm resume từ module lỗi.
- [x] Thêm cache/idempotency toàn pipeline.

## C. Module 1 — Document Intelligence

- [x] Validate MIME từ upload HTTP.
- [x] Validate PDF magic bytes.
- [ ] Từ chối PDF corrupt/password-protected — **Partial:** code đã bắt lỗi
  `pdf-lib`; chưa có automated test với PDF encrypted thật.
- [x] Kiểm tra giới hạn dung lượng/số trang.
- [x] Tạo SHA-256 checksum.
- [ ] Giới hạn input path trong project/upload directory.
- [x] Render từng trang thành PNG asset.
- [x] Tạo thumbnail cho từng trang.
- [x] Tạo Gemini multimodal provider adapter.
- [x] Parse structured output vào `documentSchema`.
- [ ] Batch PDF/page an toàn theo context limit.
- [x] Retry lỗi provider/schema/consistency tối đa 3 lần.
- [x] Cache Gemini analysis theo PDF hash, model, prompt và config.
- [x] Cache page image/thumbnail theo PDF hash.
- [ ] Lưu model/prompt/schema version.
- [x] Tạo Source Registry cấp element.
- [x] Lưu page, element type, excerpt và confidence.
- [ ] Lưu bounding box khi có thể.
- [x] Nhận diện section và thứ tự section.
- [x] Nhận diện concept theo page/section.
- [ ] Nhận diện heading hierarchy chi tiết.
- [ ] Nhận diện reading order cấp element.
- [ ] Phát hiện reference/appendix/duplicate.
- [x] Có confidence và warning cho nội dung không chắc chắn.
- [x] Đánh dấu content không hỗ trợ qua warning.
- [x] Unit test Module 1.
- [x] Integration test với PDF 3 trang và Vertex AI thật.
- [x] Integration test `Lecture-02-Process.pdf` 45 trang.
- [x] Representative evaluation Module 1 trên PDF 45 trang.
- [ ] Golden evaluation Module 1.

## D. Module 2 — Lecture Planner

- [x] Chia section thành chapter.
- [x] Giữ prerequisite trước concept phụ thuộc.
- [x] Giới hạn thời lượng từng chapter.
- [x] Implement treatment `EXPLAIN`.
- [x] Implement treatment `MENTION`.
- [x] Implement treatment `SHOW`.
- [x] Implement treatment `REFERENCE`.
- [x] Implement treatment `UNREADABLE`.
- [x] Implement treatment `DUPLICATE`.
- [x] Bắt buộc reason và source cho mỗi treatment.
- [x] Implement duration estimator.
- [x] Tạo page/source coverage manifest.
- [x] Tạo Coverage Validator.
- [x] Chặn Full mode nếu còn page chưa phân loại.
- [x] Sinh outline review artifact `02_lecture_plan.json`.
- [x] Retry Gemini với phản hồi lỗi từ validator.
- [x] Cache plan theo document/model/prompt/config.
- [x] Unit test Module 2.
- [x] Integration test `Lecture-02-Process.pdf` 45 trang.
- [x] Representative evaluation Module 2 trên PDF 45 trang.
- [ ] Golden evaluation Module 2 trên đủ golden set.
- [x] UI cho phép user duyệt/chỉnh outline trước khi sinh script.

## E. Module 3 — Script Generator

- [x] Tạo Gemini script provider adapter.
- [x] Sinh script theo từng chapter.
- [x] Giới hạn context theo source cần thiết.
- [x] Implement `GROUNDED_CLAIM`.
- [x] Implement `TEACHING_ANALOGY`.
- [x] Implement `EXAMPLE`.
- [x] Implement `TRANSITION`.
- [x] Implement `LEARNING_CHECK`.
- [x] Bắt buộc source cho grounded claim.
- [x] Tạo Grounding Validator.
- [x] Phát hiện cite đúng trang nhưng sai element.
- [x] Phát hiện claim mâu thuẫn tài liệu bằng semantic review.
- [x] Retry riêng chapter chứa narration lỗi, không sinh lại toàn script.
- [x] Kiểm tra learning objective coverage.
- [x] Sinh recap grounded cuối mỗi chapter.
- [x] Tạo pronunciation glossary.
- [x] Chunk narration tối đa 90 từ.
- [x] Ước lượng duration narration deterministic.
- [x] Chặn narration dài hơn duration chapter trong lecture plan.
- [x] Chèn pause metadata hợp lý theo narration kind bằng SSML ở Module 5B.
- [x] Cache script theo document/plan/model/prompt/config.
- [x] Unit test Module 3.
- [x] Integration test `Lecture-02-Process.pdf` 45 trang.
- [x] Representative evaluation Module 3 trên PDF 45 trang.
- [ ] Golden evaluation Module 3 trên đủ golden set.

## F. Module 4 — Storyboard Generator

- [x] Tạo template registry có schema.
- [x] Implement scene `TITLE`.
- [x] Implement scene `ORIGINAL_PAGE`.
- [x] Implement scene `CROP_AND_HIGHLIGHT`.
- [x] Implement scene `BULLET`.
- [x] Implement scene `DIAGRAM`.
- [x] Implement scene `SUMMARY`.
- [x] Ưu tiên source visual gốc.
- [x] Không cho LLM sinh animation code.
- [x] Tạo asset preparation plan.
- [x] Tạo visual fallback.
- [x] Validate mọi narration có scene.
- [x] Validate scene source ID.
- [x] Validate template props.
- [x] Unit test Module 4.
- [x] Retry Gemini theo chapter với phản hồi validator.
- [x] Cache storyboard và rebase asset path sang run hiện tại.
- [x] Integration test `Lecture-02-Process.pdf` 45 trang.
- [x] Representative evaluation Module 4 trên PDF 45 trang.
- [ ] Golden evaluation Module 4 trên đủ golden set.

## G. Module 5A — Visual Generator

- [x] Cài đặt và cấu hình Remotion.
- [x] Tạo composition chính.
- [x] Tạo scene dispatcher.
- [x] Tạo theme/font tiếng Việt.
- [x] Render template `TITLE`.
- [x] Render template `ORIGINAL_PAGE`.
- [x] Render template `CROP_AND_HIGHLIGHT`.
- [x] Render template `BULLET`.
- [x] Render template `DIAGRAM`.
- [x] Render template `SUMMARY`.
- [x] Crop đúng theo bounding box và letterbox của ảnh `contain`.
- [x] Implement zoom/pan/highlight deterministic.
- [x] Kiểm tra text overflow.
- [x] Kiểm tra contrast/safe area.
- [x] Tạo visual manifest có checksum/status/warning.
- [x] Render smoke test.
- [x] Retry từng scene và dùng visual fallback nếu primary render lỗi.
- [x] Cache từng scene, bỏ run-specific path khỏi cache identity.
- [x] Integration render 84/84 scene của `Lecture-02-Process.pdf`.
- [x] Representative evaluation Module 5A trên PDF 45 trang.
- [ ] Golden evaluation Module 5A trên đủ golden set.

## H. Module 5B — Voice Generator

- [x] Tạo TTS provider interface.
- [x] Chọn Google Cloud Text-to-Speech làm provider mặc định cho MVP.
- [x] Sinh một audio file cho mỗi scene.
- [x] Cache theo SSML, language, voice, speaking rate, sample rate và provider version.
- [x] Retry từng scene độc lập tối đa ba lần.
- [x] Chuẩn hóa LINEAR16/WAV PCM mono 16-bit, 24 kHz.
- [x] Probe duration thật từ WAV.
- [x] Áp dụng pronunciation glossary bằng SSML `sub`.
- [x] Chèn pause theo narration kind.
- [x] Loại source ID/citation trước khi gửi TTS.
- [x] Tạo và validate voice manifest, checksum và coverage 1:1.
- [x] Test audio thật bằng `vi-VN-Neural2-A`.
- [x] Unit test retry, final fallback và cache hit.
- [x] Kiểm tra voice tồn tại trước khi chạy batch.
- [x] Integration test 84/84 scene của `Lecture-02-Process.pdf`.
- [x] Representative evaluation Module 5B trên PDF 45 trang.
- [ ] Golden evaluation Module 5B trên đủ golden set.

## I. Module 6 — Video Composer

- [x] Dùng audio duration điều khiển scene duration.
- [ ] Đồng bộ animation với voice — **Partial:** timeline và độ dài visual đã
  đồng bộ theo voice thật; video MVP hiện dùng slide tĩnh, chưa có animation nội cảnh.
- [x] Thêm khoảng nghỉ giữa chapter.
- [x] Sinh subtitle SRT/VTT.
- [x] Kiểm tra subtitle dễ đọc.
- [x] Sinh chapter timestamp.
- [x] Render từng chapter/segment.
- [x] Ghép video bằng FFmpeg.
- [x] Chuẩn hóa codec.
- [x] Resume chapter render bị lỗi bằng cache từng segment.
- [x] Sinh coverage report.
- [x] Kiểm tra video mở được.
- [x] Kiểm tra audio tồn tại.
- [x] Kiểm tra subtitle/timestamp.
- [x] Chặn output nếu còn scene failed.
- [x] End-to-end test `Lecture-02-Process.pdf` 45 trang.

## J. Backend

- [x] API upload PDF.
- [x] API tạo job.
- [x] Job runner chạy ngoài HTTP request.
- [x] Giới hạn concurrency.
- [x] Timeout theo module.
- [x] API lấy trạng thái job.
- [x] API cancel/retry job.
- [x] Pipeline pause sau Module 2.
- [x] API approve outline.
- [x] Serve video/subtitle/report an toàn.

## K. Web app

- [x] Trang upload PDF.
- [x] Hiển thị giới hạn file.
- [ ] Chọn coverage mode.
- [ ] Chọn audience/language/voice — **Partial:** language và voice ID đã được
  truyền thật, backend chặn voice sai ngôn ngữ; audience vẫn dùng mặc định.
- [x] Upload progress.
- [x] Preview document analysis.
- [x] Hiển thị chapter và thời lượng dự kiến.
- [x] Hiển thị warning/unreadable page.
- [x] Outline review và approve.
- [x] Processing progress theo module.
- [x] Hiển thị Module 5A/5B song song.
- [x] Result video player.
- [x] Chapter navigation.
- [x] Download MP4/SRT.
- [x] Coverage summary.
- [x] Link chapter về source page.
- [x] Form feedback.

## L. Evaluation

- [ ] Chốt quality bar trước khi chạy golden set.
- [ ] Đo schema pass rate trên golden set — **Partial:** artifact đại diện đã
  pass Zod/validator.
- [ ] Đo page/source coverage trên golden set — **Partial:** PDF đại diện đạt
  45/45 trang và 50/50 source.
- [ ] Đo grounded claim rate trên golden set — **Partial:** PDF đại diện có
  49 grounded claims, 44/44 source cần dạy được cite.
- [ ] Đo unsupported claim trên golden set — **Partial:** semantic review bản
  đại diện không còn issue sau repair.
- [x] Đo render success trên representative PDF: 84/84 segment và MP4 pass.
- [ ] Đo audio/visual sync — **Partial:** timestamp được kiểm tra tự động; chưa
  có human listening/watch evaluation trên toàn video.
- [x] Đo duration estimate error trên representative PDF.
- [ ] Đo latency và chi phí — **Partial:** đã đo latency representative/cache,
  chưa lưu token usage và chi phí.
- [ ] Chạy toàn bộ golden set.
- [ ] Ghi lại tất cả case fail.
- [ ] User test với ít nhất 5 người.
- [ ] Ghi feedback nguyên văn.
- [ ] Thực hiện ít nhất một thay đổi từ feedback.

## M. Security và privacy

- [x] `.env` được ignore.
- [x] Local development dùng ADC, không dùng static API key.
- [x] Không log secret.
- [x] Safe filename/path.
- [x] Chống path traversal.
- [ ] Không thực thi content nhúng trong PDF.
- [ ] Chống prompt injection từ PDF — **Partial:** prompt đã coi PDF là dữ liệu
  và cấm làm theo instruction trong tài liệu; chưa có adversarial test.
- [x] Rate limit và quota — API có rate limit toàn cục và quota riêng theo user
  cho job đang chạy, số job lưu, dung lượng và phút video theo tháng.
- [x] Chính sách retention — cấu hình bằng `JOB_RETENTION_DAYS`; chỉ tự xóa job
  terminal quá hạn, không xóa job đang hoạt động.
- [x] Xóa toàn bộ artifact của một job — kiểm tra owner, từ chối job đang chạy,
  xóa metadata/upload/run local cùng Firestore và Storage.
- [ ] Xác minh data policy của AI/TTS provider.

## N. Deployment và demo

- [ ] Kiểm tra Node.js version.
- [ ] Kiểm tra FFmpeg.
- [ ] Kiểm tra Chromium/Remotion.
- [ ] Đóng gói font tiếng Việt.
- [ ] Ghi version model/prompt/schema.
- [ ] Một lệnh setup môi trường.
- [ ] Chuẩn bị PDF demo được phép sử dụng.
- [ ] Chuẩn bị expected outline và golden claims.
- [ ] Chuẩn bị một failure case an toàn.
- [ ] Dry run toàn bộ demo.
- [ ] Xác minh MP4/SRT/coverage report trên máy demo.

## O. Milestones

## P. Thư viện PDF và tóm tắt bằng AI

- [x] Upload PDF ở trang Tạo video mới sẽ lưu tài liệu ngay lập tức.
- [x] Tài liệu lưu thật bằng metadata của job và Firebase Storage khi Firebase được bật.
- [x] Chỉ chạy Module 1 khi người dùng mới tải tài liệu lên.
- [x] Có nút Tạo Video trên từng tài liệu và gắn đúng PDF vào bước tải tài liệu.
- [x] Tạo video từ tài liệu đã phân tích sẽ tiếp tục từ Module 2.
- [x] Có nút Tóm Tắt và màn hình đọc chia đôi PDF/bản tóm tắt.
- [x] Module 7 nhận `01_document.json`, gọi Gemini với structured output và kiểm tra trang nguồn.
- [x] Bản tóm tắt được cache ở `07_summary.json`.
- [x] API PDF và tóm tắt kiểm tra Firebase ID token và quyền sở hữu tài liệu.
- [x] Backend build và 62 unit/integration test đều đạt.
- [x] Frontend production build đạt.

## Q. Sửa lỗi duration khi tiếp tục pipeline

- [x] Đối chiếu artifact thật của job lỗi: plan 255 giây, script 428 từ, TTS khoảng 130 giây.
- [x] Module 1 giữ nguyên vì checksum, page/source và Document Intelligence không gây sai thời lượng.
- [x] Module 2 giảm overhead chapter giả từ 18 giây xuống 2 giây và lập word budget theo 175 từ/phút.
- [x] Module 3 dùng word budget 160–183 từ/phút, target 175 từ/phút và tăng prompt/cache version.
- [x] Retry lỗi `DURATION_OUT_OF_RANGE` quay về Module 3, reset Module 3–6 và bypass generation cache.
- [x] Module 4 tái tạo storyboard từ script mới; không dùng storyboard cũ.
- [x] Module 5A/5B được reset đồng thời; voice cache thay đổi theo SSML và speaking rate.
- [x] Module 5B đo duration thật và tự tái tổng hợp một lần nếu Module 6 không thể hiệu chỉnh an toàn.
- [x] Module 6 tiếp tục là cổng chặn cuối, không xuất video ngoài khoảng người dùng chọn.
- [x] Có regression test cho word budget 3–5 phút và TTS audio quá ngắn.
- [x] Toàn bộ unit/integration test và frontend production build đều đạt.

## R. Tolerance narration và xóa riêng video

- [x] Word budget của Module 3 cho phép lệch tối đa 15% ở cả hai phía.
- [x] Duration estimate của từng chapter cho phép lệch tối đa 25%.
- [x] Regression case 286 từ so với 257 từ và 102 giây so với 84 giây được pass.
- [x] Module 6 vẫn bắt buộc video cuối nằm trong option thời lượng người dùng chọn.
- [x] Trang Video gọi API xóa video riêng, không gọi API xóa toàn bộ job.
- [x] Xóa video chỉ xóa artifact Module 2–6 ở local và Firebase Storage.
- [x] PDF gốc, Firebase input, `01_document.json`, ảnh trang và `07_summary.json` được giữ lại.
- [x] Sau khi xóa video, job trở lại `DOCUMENT_READY` và vẫn xuất hiện trong thư viện tài liệu.
- [x] Xóa tài liệu từ trang Tài liệu vẫn là thao tác xóa toàn bộ có xác nhận riêng.
- [x] Backend đạt 62/62 test; frontend production build đạt.

- [ ] M1 — PDF tạo được `01_document.json`.
- [ ] M2 — Tạo được plan và script có căn cứ.
- [x] M3 — Tạo được storyboard, visual và voice.
- [x] M4 — Một PDF tạo được video end-to-end.
- [ ] M5 — Upload và xem kết quả qua web app — **Partial:** luồng kỹ thuật đã
  được kiểm thử bằng backend và browser thật; Phase 10/user validation chưa hoàn
  tất nên chưa đạt định nghĩa milestone trong `Tasks.md`.
- [ ] M6 — Golden set, user validation và demo hoàn tất.

## S. Public deployment trên Google Cloud

### S0. Trạng thái sẵn sàng hiện tại

- [x] Đã có Google Cloud project và billing/free credit.
- [x] Đã đăng nhập `gcloud` và Application Default Credentials cho local development.
- [x] Đã chọn region chính `asia-southeast1`.
- [x] Firebase Authentication online đã hoạt động.
- [x] Backend đã tích hợp Firestore và Firebase Storage ở mức ứng dụng.
- [x] Frontend production build thành công.
- [x] Backend unit/integration test đang đạt 62/62.
- [x] Backend có chế độ cloud-native: Firestore repository, Cloud Storage artifact và Cloud Run Job dispatcher; chế độ local chỉ dùng cho development/test.
- [x] Đã có Dockerfile production chứa Node.js, FFmpeg, Chromium/Remotion và font tiếng Việt.

### S1. Chốt kiến trúc production — P0

- [ ] Frontend tĩnh chạy trên Firebase Hosting.
- [ ] Backend HTTP/API chạy trên Cloud Run Service.
- [ ] Pipeline Module 1–6 chạy bất đồng bộ bằng Cloud Run Job, không chạy dài trong HTTP request.
- [ ] Firestore là nguồn dữ liệu chính duy nhất cho job/status/module progress/quota.
- [ ] Cloud Storage là nguồn lưu trữ chính duy nhất cho PDF, page assets, summary, MP4 và artifact.
- [ ] API tạo video trả `202 Accepted` nhanh và kích hoạt worker theo `jobId`.
- [ ] Frontend tiếp tục polling trạng thái hoặc nghe Firestore; không giữ HTTP request đến khi render xong.
- [ ] Video/PDF được cấp signed URL có thời hạn; bucket không public.
- [ ] Chốt naming cho môi trường: `lecture-api`, `lecture-worker`, bucket và collection production.
- [ ] Chốt `asia-southeast1` cho Cloud Run, Cloud Run Jobs, Artifact Registry và Cloud Build.
- [ ] Kiểm tra location hiện tại của Firestore và Storage bucket để tránh latency/egress không cần thiết.

### S2. Tách dữ liệu khỏi filesystem local — P0

- [x] Thay JobStore JSON local bằng Firestore repository dùng thật ở production.
- [x] Không dùng dữ liệu trong memory của API làm queue hoặc nguồn trạng thái chính.
- [x] Upload PDF bằng stream lên Cloud Storage, chỉ lưu object path trong Firestore và xóa file staging của API ở cloud mode.
- [x] Worker download input/artifact cần thiết vào thư mục tạm khi bắt đầu execution.
- [x] Worker upload run artifact lên Cloud Storage sau mỗi module hoàn tất và đồng bộ lần cuối khi execution kết thúc.
- [x] Worker cập nhật trạng thái Module 1–6, progress, warning và error vào Firestore.
- [x] Khi worker kết thúc, không phụ thuộc vào dữ liệu còn lại trong `/tmp` hoặc container filesystem.
- [x] Resume/retry đọc artifact đã hoàn thành từ Cloud Storage thay vì `runs/<jobId>` local.
- [x] Module 7 đọc `01_document.json` từ Cloud Storage và ghi `07_summary.json` trở lại Storage.
- [x] Xóa video chỉ xóa object Module 2–6; giữ PDF, Module 1, page assets và summary.
- [x] Xóa tài liệu xóa toàn bộ object/job thuộc đúng owner.
- [ ] Thiết lập lifecycle rule cho artifact cũ theo chính sách retention.

### S3. Docker hóa backend và worker — P0

- [x] Tạo Dockerfile production theo multi-stage build.
- [x] Pin Node.js 22 tương thích với project.
- [x] Cài FFmpeg/FFprobe trong image và có build-time verification.
- [x] Cài Chromium và cấu hình Remotion dùng browser executable trong image.
- [x] Đóng gói Noto font hỗ trợ tiếng Việt và có build-time font verification.
- [x] Chạy container bằng non-root user `node`.
- [x] Thêm health endpoint và Docker healthcheck cho Cloud Run API.
- [x] Tách entrypoint `api` và `worker`, dùng chung một image/version.
- [x] Worker nhận `PIPELINE_JOB_ID`, đọc cấu hình từ Firestore rồi thoát với exit code rõ ràng.
- [x] Không copy `.env`, ADC local, secret hoặc file credential vào image.
- [x] Thêm `.dockerignore` cho `node_modules`, `runs`, `outputs`, `.cache`, `.env` và file upload.
- [ ] Build và chạy thử Docker local với một PDF ngắn.
- [ ] Xác minh MP4, audio, Chromium và font trong container trước khi deploy.

### S4. Google Cloud resources — P0

- [ ] Bật Cloud Run API.
- [ ] Bật Cloud Build API.
- [ ] Bật Artifact Registry API.
- [ ] Bật Cloud Run Admin API/Jobs API cần thiết.
- [ ] Bật Secret Manager API.
- [ ] Bật Cloud Logging và Monitoring cần thiết.
- [ ] Tạo Artifact Registry repository tại `asia-southeast1`.
- [ ] Tạo service account riêng cho Cloud Run API.
- [ ] Tạo service account riêng cho Cloud Run worker.
- [ ] Cấp API service account quyền Firestore/Storage tối thiểu và quyền chạy Cloud Run Job.
- [ ] Cấp worker service account quyền Vertex AI, Text-to-Speech, Firestore và Storage tối thiểu.
- [ ] Không cấp Owner/Editor cho runtime service accounts.
- [ ] Lưu secret nhạy cảm trong Secret Manager; biến cấu hình không nhạy cảm dùng Cloud Run env vars.
- [ ] Ghi lại toàn bộ resource name, region và service account trong tài liệu deployment.

### S5. Deploy Cloud Run API Service — P0

- [ ] Build image và push lên Artifact Registry với tag commit SHA, không chỉ dùng `latest`.
- [ ] Deploy API service tại `asia-southeast1`.
- [ ] API chỉ xử lý request ngắn: auth, upload, CRUD, status, retry và tạo execution.
- [ ] Cấu hình khoảng 1 CPU, 512 MiB–1 GiB RAM để bắt đầu.
- [ ] Cấu hình min instances `0`, max instances nhỏ trong giai đoạn dùng thử.
- [ ] Cấu hình concurrency ban đầu khoảng 20–40 cho API và đo lại bằng thực tế.
- [ ] Cấu hình request timeout khoảng 60–120 giây; không dùng timeout dài để render video.
- [ ] Cho phép public ingress nhưng mọi API dữ liệu vẫn kiểm tra Firebase ID token và owner.
- [ ] Cấu hình CORS chỉ cho domain Firebase Hosting/preview/local được phép.
- [ ] Kiểm tra `/api/health`, login, upload, list job và delete bằng URL Cloud Run thật.
- [ ] Xác minh log request không chứa token, signed URL hoặc nội dung secret.

### S6. Deploy Cloud Run Job worker — P0

- [ ] Tạo Cloud Run Job từ cùng image backend hoặc image worker riêng đã pin version.
- [ ] Cấu hình ban đầu 2–4 CPU và 4–8 GiB RAM; đo lại khi render PDF 80 trang.
- [ ] Cấu hình task timeout 60–90 phút cho demo.
- [ ] Cấu hình task retries `0` hoặc `1` để tránh nhân đôi chi phí ngoài ý muốn.
- [ ] Mỗi task chỉ xử lý một `jobId`.
- [ ] Giới hạn số execution đồng thời trong giai đoạn public test.
- [ ] API truyền `jobId` an toàn khi tạo execution; worker tự tải dữ liệu từ Firestore/Storage.
- [ ] Worker cập nhật heartbeat/progress để nhận diện task treo.
- [ ] Worker xử lý idempotent: chạy lại không tạo duplicate job hoặc ghi đè sai artifact.
- [ ] Cancel trên UI có thể dừng/đánh dấu hủy execution tương ứng.
- [ ] Retry bắt đầu đúng module và tái sử dụng artifact Cloud Storage hợp lệ.
- [ ] Xác minh một execution hoàn chỉnh từ PDF đến MP4 trên Cloud Run Job.

### S7. Firebase Hosting frontend — P0

- [ ] Tạo cấu hình production cho `VITE_API_BASE_URL` trỏ tới Cloud Run API.
- [ ] Thêm domain Firebase Hosting vào Firebase Authentication Authorized domains.
- [ ] Cấu hình Firebase Hosting phục vụ thư mục `frontend/dist`.
- [ ] Cấu hình SPA rewrite về `index.html` cho client-side routing.
- [ ] Không proxy upload/render dài qua Hosting rewrite nếu có nguy cơ chạm timeout.
- [ ] Build frontend bằng production Firebase config.
- [ ] Deploy lên URL `PROJECT_ID.web.app`.
- [ ] Kiểm tra login/register/logout trên domain public.
- [ ] Kiểm tra upload PDF, tạo video, summary, xem video và xóa video trên domain public.
- [ ] Tạo Firebase Hosting preview channel cho thay đổi trước production.
- [ ] Chỉ gắn custom domain sau khi luồng mặc định chạy ổn định.

### S8. CI/CD và cập nhật phiên bản — P1

- [ ] Đưa `codebase/frontend` và `codebase/backend` vào Git repository rõ ràng.
- [ ] Chọn branch flow: pull request → preview/staging → merge `main` → production.
- [ ] Cloud Build chạy backend typecheck/test trước khi build image.
- [ ] Cloud Build push image lên Artifact Registry với `$COMMIT_SHA`.
- [ ] Cloud Build deploy revision mới cho Cloud Run API.
- [ ] Cloud Build cập nhật image của Cloud Run Job cùng commit/version.
- [ ] GitHub Action build frontend và tạo Firebase Hosting preview cho pull request.
- [ ] Merge vào `main` mới deploy Firebase Hosting live.
- [ ] Không dùng service-account JSON key trong GitHub; dùng Workload Identity Federation.
- [ ] Có bước manual approval cho production trong giai đoạn đầu.
- [ ] Ghi version frontend/backend/worker vào health hoặc metadata để debug lệch revision.
- [ ] Thử rollback Cloud Run revision và Firebase Hosting version trước khi mời người dùng.

### S9. Security, abuse và chi phí — P0 trước khi public

- [ ] Bật budget và email alert theo các mốc phù hợp với khoản credit hiện có.
- [ ] Đặt quota theo user cho số job đang chạy, số phút video và dung lượng lưu trữ.
- [ ] Đặt max instances/executions để lỗi hoặc abuse không tiêu hết credit.
- [ ] Bật rate limit cho upload, retry, summary và tạo video.
- [ ] Chỉ user đã xác thực mới được upload hoặc tạo job.
- [ ] Kiểm tra owner ở mọi PDF/video/artifact/status/delete endpoint.
- [ ] Bucket không public; dùng signed URL ngắn hạn cho download/stream.
- [ ] Kiểm tra PDF magic bytes, kích thước 50 MB và tối đa 80 trang ở backend.
- [ ] Thêm Firebase App Check hoặc lớp chống abuse tương đương sau MVP.
- [ ] Thiết lập log-based alert cho error rate, worker failure, timeout và quota spike.
- [ ] Thiết lập retention và nút xóa dữ liệu người dùng hoạt động trên Firestore/Storage thật.
- [ ] Viết privacy notice ngắn về việc PDF được gửi tới Gemini/TTS và thời gian lưu trữ.

### S10. Staging và production validation — P0

- [ ] Ưu tiên tạo project staging riêng; nếu chưa đủ thời gian thì tách resource/prefix dev và prod.
- [ ] Deploy staging trước production.
- [ ] Chạy smoke test PDF 1–3 trang.
- [ ] Chạy test PDF đại diện 29 trang.
- [ ] Chạy test gần giới hạn 80 trang.
- [ ] Kiểm tra đủ các option thời lượng, ngôn ngữ, giọng đọc, phong cách và tỉ lệ.
- [ ] Kiểm tra retry Module 3–6 trên cloud.
- [ ] Kiểm tra xóa video giữ PDF và xóa tài liệu xóa toàn bộ trên cloud.
- [ ] Kiểm tra restart/scale-to-zero không làm mất job hoặc artifact.
- [ ] Kiểm tra hai user không đọc/xóa được dữ liệu của nhau.
- [ ] Kiểm tra signed URL hết hạn đúng.
- [ ] Kiểm tra chi phí của ít nhất ba video đại diện.
- [ ] Mời nhóm nhỏ 3–5 người dùng thử trước khi public rộng.

### S11. Điều kiện Go Live

- [ ] Không còn dữ liệu bắt buộc nào chỉ tồn tại trên filesystem Cloud Run.
- [ ] API trả nhanh và video pipeline chạy hoàn toàn bất đồng bộ.
- [ ] Một PDF tạo video end-to-end thành công trên production.
- [ ] Retry/cancel/delete đã được xác minh bằng resource thật.
- [ ] Firebase Auth, Firestore rules, Storage access và IAM đã được kiểm tra.
- [ ] CI/CD deploy được frontend, API và worker từ một commit xác định.
- [ ] Rollback đã được thử thành công.
- [ ] Budget alert, quota, max instances và retention đã bật.
- [ ] Có trang hoặc thông báo hỗ trợ khi job lỗi.
- [ ] Có checklist demo và tài khoản test không chứa dữ liệu nhạy cảm.
