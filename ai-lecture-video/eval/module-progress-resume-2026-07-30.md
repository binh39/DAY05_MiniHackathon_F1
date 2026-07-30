# Module progress, timeout và resume evaluation — 2026-07-30

## Orchestration

- Pipeline phát JSON event `MODULE_STARTED`, `MODULE_COMPLETED`,
  `MODULE_FAILED`; backend chỉ nhận event qua schema validation.
- Job lưu state, started/completed time và error riêng cho Module 1–6.
- Module 5A và 5B có state cùng timeout độc lập khi chạy song song.
- Progress chỉ cộng trọng số sau khi module thật sự hoàn tất.

## Timeout và retry

- Có timeout cấu hình riêng cho 1, 2, 3, 4, 5A, 5B và 6.
- Khi timeout/fail, job lưu chính xác `failed_module`.
- Retry giữ nguyên `run_id`, plan đã duyệt và artifact trước điểm lỗi.
- Nếu chỉ 5A hoặc 5B lỗi, nhánh song song đã hoàn tất được giữ lại.
- Module 6 retry không chạy lại Gemini, visual hoặc TTS.

## Upload và UI

- Upload sử dụng XHR byte progress thay vì phần trăm giả.
- Processing card hiển thị từng module; 5A/5B nằm trong nhánh song song.
- Job lỗi hiển thị module lỗi và hành động tiếp tục từ module đó.

## Xác minh

- 50/50 backend unit/integration test pass.
- Test retry xác minh cùng `run_id`, giữ Module 1–2 và bắt đầu lại Module 3.
- Test nhánh 5A xác minh giữ Module 5B đã hoàn tất.
- Pipeline smoke với `PIPELINE_START_MODULE=module6_video_composer` chỉ phát
  event Module 6 và hoàn tất bằng cache, không chạy lại Module 1–5.
- Browser QA xác minh upload đạt 100%, không tạo duplicate optimistic card,
  hiển thị bốn module completed và 5A/5B cùng running.
- Không có console error; tài khoản Firebase QA đã được xóa sau kiểm thử.
