# Checklist — AI Lecture Video

> Quy tắc: chỉ tick `[x]` khi task đạt Definition of Done trong `Tasks.md`.
> Không tick module chỉ vì đã có folder hoặc interface.
> Mục ghi **Partial** vẫn để `[ ]`; phần đã có được mô tả để không mất dấu tiến độ.

## Trạng thái audit — 2026-07-30

| Nhóm | Hoàn thành | Tổng |
|---|---:|---:|
| Product scope | 4 | 8 |
| Foundation | 10 | 16 |
| Module 1 | 20 | 30 |
| Module 2 | 20 | 22 |
| Module 3 | 24 | 25 |
| Module 4–6 | 70 | 74 |
| Backend + Web app | 0 | 27 |
| Evaluation | 2 | 14 |
| Security + Deployment | 2 | 22 |
| Milestones | 2 | 6 |
| **Tổng cộng** | **154** | **244** |

Có 10 task đang ở trạng thái **Partial**. Audit dựa trên code, 42 unit/integration
test, artifact thật của `Lecture-02-Process.pdf` và các báo cáo trong `eval/`.
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
- [ ] Tạo job state machine.
- [ ] Tạo error taxonomy.
- [ ] Thêm structured logging.
- [ ] Thêm resume từ module lỗi.
- [ ] Thêm cache/idempotency toàn pipeline — **Partial:** Module 1–6 đã có cache
  riêng; chưa có resume orchestration từ một module tùy ý.

## C. Module 1 — Document Intelligence

- [ ] Validate MIME từ upload HTTP.
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
- [ ] UI cho phép user duyệt/chỉnh outline trước khi sinh script.

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

- [ ] API upload PDF.
- [ ] API tạo job.
- [ ] Job runner chạy ngoài HTTP request.
- [ ] Giới hạn concurrency.
- [ ] Timeout theo module.
- [ ] API lấy trạng thái job.
- [ ] API cancel/retry job.
- [ ] Pipeline pause sau Module 2.
- [ ] API approve outline.
- [ ] Serve video/subtitle/report an toàn.

## K. Web app

- [ ] Trang upload PDF.
- [ ] Hiển thị giới hạn file.
- [ ] Chọn coverage mode.
- [ ] Chọn audience/language/voice.
- [ ] Upload progress.
- [ ] Preview document analysis.
- [ ] Hiển thị chapter và thời lượng dự kiến.
- [ ] Hiển thị warning/unreadable page.
- [ ] Outline review và approve.
- [ ] Processing progress theo module.
- [ ] Hiển thị Module 5A/5B song song.
- [ ] Result video player.
- [ ] Chapter navigation.
- [ ] Download MP4/SRT.
- [ ] Coverage summary.
- [ ] Link chapter về source page.
- [ ] Form feedback.

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
- [ ] Không log secret.
- [ ] Safe filename/path.
- [ ] Chống path traversal.
- [ ] Không thực thi content nhúng trong PDF.
- [ ] Chống prompt injection từ PDF — **Partial:** prompt đã coi PDF là dữ liệu
  và cấm làm theo instruction trong tài liệu; chưa có adversarial test.
- [ ] Rate limit và quota.
- [ ] Chính sách retention.
- [ ] Xóa toàn bộ artifact của một job.
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

- [ ] M1 — PDF tạo được `01_document.json`.
- [ ] M2 — Tạo được plan và script có căn cứ.
- [x] M3 — Tạo được storyboard, visual và voice.
- [x] M4 — Một PDF tạo được video end-to-end.
- [ ] M5 — Upload và xem kết quả qua web app.
- [ ] M6 — Golden set, user validation và demo hoàn tất.
