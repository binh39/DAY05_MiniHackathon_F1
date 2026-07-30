# Outline approval — 2026-07-30

## Luồng đã triển khai

1. Job mới chạy Module 1 và Module 2.
2. Pipeline trả `AWAITING_APPROVAL`, progress 30%.
3. API đọc `01_document.json`, `02_lecture_plan.json` và `00_config.json`.
4. Frontend hiển thị document preview, section, concept, warning, coverage và
   chapter.
5. User sửa title, learning objective, thứ tự và mức chi tiết chapter.
6. Backend tái dựng plan từ artifact gốc, không cho client thay source/item ID.
7. Khi approve, plan gốc được backup và job chuyển sang
   `QUEUED_AFTER_APPROVAL`.
8. Pipeline resume từ Module 3 trong cùng run directory.

## API

- `GET /api/jobs/:id/outline`
- `PUT /api/jobs/:id/outline`
- `POST /api/jobs/:id/approve`
- `GET /api/jobs/:id/outline/pages/:page/thumbnail`

Tất cả endpoint đều yêu cầu Firebase ID token và kiểm tra `owner_uid`.

## Kiểm thử

- Backend 48/48 test pass sau khi bổ sung result navigation.
- Integration test xác minh preview, edit, approve, backup plan và trạng thái
  queue sau approve.
- Frontend build pass.
- Browser QA xác minh:
  - mở card `Chờ duyệt`;
  - render hai chapter và thumbnail;
  - sửa title và detail level;
  - đổi thứ tự chapter;
  - lưu draft;
  - POST đúng payload khi bấm `Duyệt và tạo video`;
  - quay về trang video, không có console/page error.
- Pipeline smoke thật với `inputs/example.pdf`:
  - mode `plan` chỉ tạo `01_document.json` và `02_lecture_plan.json`, không tạo
    script/video, sau đó phát marker `PIPELINE_STATUS:AWAITING_APPROVAL`;
  - mode `resume` dùng cùng `run_id`, bắt đầu trực tiếp tại Module 3 và tạo đủ
    script, storyboard, visual, voice, MP4 cùng `06_video_manifest.json`;
  - không chạy lại Module 1–2 trong chặng resume.

## Giới hạn còn lại

- Estimate trên đầu trang là estimate ban đầu; backend mới tính lại plan khi lưu
  hoặc approve.
- Chưa cho sửa trực tiếp source assignment hoặc treatment để tránh phá coverage.
- Chưa có collaborative editing/version history.
