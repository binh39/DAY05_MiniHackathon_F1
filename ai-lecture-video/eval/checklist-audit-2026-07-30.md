# Checklist audit — 2026-07-30

## Phạm vi kiểm tra

Audit đối chiếu `Checklist.md` và `Tasks.md` với:

- implementation trong `src/`;
- test trong `tests/`;
- artifact thật `01_document.json`, `02_lecture_plan.json`, `03_script.json`;
- evaluation của `Lecture-02-Process.pdf`;
- kết quả `npm run typecheck`, `npm test`, `npm run inspect`.

Kết quả kiểm tra lại: typecheck pass, 42/42 test pass, pipeline end-to-end exit 0.

## Phần đã xác minh

### Foundation

- TypeScript strict, Zod contracts, pipeline runner, artifact store và CLI hoạt
  động.
- Module 5A/5B chạy song song; Module 6 compose MP4/SRT/coverage và pipeline
  hoàn tất với exit code 0.
- Module 1–6 có cache riêng; chưa có resume orchestration từ module tùy ý.

### Module 1

- Chạy thật với PDF 45 trang, tạo đủ 45 PNG và 45 thumbnail.
- Có checksum, magic-byte/page/size validation, Gemini structured output,
  consistency validator, retry và cache.
- Source Registry có 50 source và page/section traceability.
- Chưa có bounding box, heading hierarchy, element reading order hoặc HTTP MIME
  validation.
- Code bắt lỗi PDF corrupt/encrypted nhưng chưa có automated encrypted-PDF test,
  nên mục này được để Partial.

### Module 2

- Artifact thật gồm 8 chapter, 48 item, 45/45 trang và 50/50 source.
- Có sáu treatment, duration estimator, coverage manifest, validator, retry và
  cache.
- Chapter dài nhất dưới giới hạn 8 phút.
- Còn thiếu UI duyệt/chỉnh outline và evaluation trên đủ golden set.

### Module 3

- Artifact thật gồm 8 chapter, 84 narration, 49 grounded claim.
- 44/44 source cần dạy được cite; không thiếu objective hoặc semantic issue.
- Có năm narration kind, recap cuối chapter, learning check, glossary, chunk
  limit, duration validator, semantic review, scoped repair và cache.
- Còn thiếu pause metadata và evaluation trên đủ golden set.

### Module 4

- Chạy thật 84/84 scene, không thiếu/trùng narration, không có source sai và
  duration delta bằng 0.
- Có đủ sáu template trong registry; PDF đại diện sử dụng `TITLE`,
  `ORIGINAL_PAGE`, `BULLET`, `DIAGRAM`, `SUMMARY`.
- `CROP_AND_HIGHLIGHT` đã được unit test với bbox; artifact thật không dùng vì
  Module 1 chưa cung cấp bbox và hệ thống không được phép bịa tọa độ.
- Asset plan, fallback, validator, retry và cache đã hoạt động. Cache rebase
  đúng page asset sang run hiện tại.
- Còn thiếu evaluation trên đủ golden set.

### Module 5A

- Pin Remotion, renderer và bundler cùng phiên bản `4.0.501`.
- Render thật 84/84 scene ở 1920×1080; tất cả trạng thái `READY`.
- Không thiếu file; toàn bộ SHA-256 trong manifest khớp asset.
- Đã mở kiểm tra trực quan `TITLE`, `ORIGINAL_PAGE`, `BULLET`, `DIAGRAM`,
  `SUMMARY`; `CROP_AND_HIGHLIGHT` có smoke fixture riêng.
- Cache hit 84/84 scene và không phụ thuộc đường dẫn chứa `run_id`.
- Còn thiếu evaluation trên đủ golden set.

### Module 5B

- Google Cloud Text-to-Speech đã sinh thật 84/84 WAV bằng
  `vi-VN-Neural2-A`; 77 `READY`, 7 `WARNING`, 0 `FAILED`.
- Manifest coverage 1:1 với storyboard; checksum, duration và sample rate được
  probe và đối chiếu lại từ từng file.
- Có SSML glossary/pause, loại source ID/citation, retry ba lần, silent fallback
  và cache theo SSML + toàn bộ voice config.
- Cache hit 84/84 ở lần chạy kiểm tra lại.
- Tổng audio thực 902,56 giây, ngắn hơn estimate 1.634 giây 44,8%; bảy scene
  lệch trên 50% được giữ warning.
- Còn thiếu human listening evaluation và evaluation trên đủ golden set.

### Module 6

- Render thật 84/84 segment và concat thành MP4 dài 908,121 giây.
- FFprobe xác nhận H.264/AAC, 1920×1080, 30 fps và có audio stream.
- Timeline dùng duration voice thật, căn frame và thêm 0,6 giây giữa chapter.
- Sinh 248 SRT cue, tám chapter timestamp và coverage report đạt 100%.
- Checksum MP4/SRT/coverage được ghi trong manifest; không có scene `FAILED`.
- Cache hit 84/84 segment ở lần chạy lại; pipeline hoàn tất khoảng 12 giây.
- Đã mở ba frame đại diện ở chapter 1/4/8; font và layout hợp lệ.
- Còn thiếu animation nội cảnh, human watch/listening evaluation và golden set.

## Những tick đã được sửa trong audit

- Bỏ tick `Golden evaluation Module 2`.
- Bỏ tick `Golden evaluation Module 3`.
- Đổi thành `Representative evaluation` cho Module 1–3.
- Hạ PDF corrupt/password-protected thành Partial do thiếu encrypted fixture.
- Ghi rõ Module 1–6 có cache riêng, nhưng chưa có resume orchestration toàn pipeline.
- Ghi rõ prompt-injection protection mới ở mức prompt/schema, chưa có
  adversarial test.
- Đổi trạng thái Phase 3–4 trong `Tasks.md` thành core backend, không tuyên bố
  hoàn tất toàn phase.

## Task kế tiếp theo đường găng

Productization và validation:

1. Xem/nghe toàn bộ video đại diện và ghi lỗi timestamp/phát âm/layout.
2. Bổ sung animation nội cảnh hoặc transition nếu user test cho thấy slide tĩnh
   làm giảm khả năng theo dõi.
3. Chạy đủ golden PDF set.
4. Xây backend job + upload UI để người dùng chạy pipeline.
