# Result navigation evaluation — 2026-07-30

## Phạm vi

- Chapter navigation theo timestamp thật từ `06_video_manifest.json`.
- Coverage summary từ lecture plan đã duyệt.
- Liên kết chapter về source và ảnh trang PDF.
- API và trang nguồn chỉ cho phép chủ sở hữu job đã hoàn tất truy cập.

## Kiểm thử tự động

- `GET /api/jobs/:id/result` trả chapter, start/end timestamp, coverage, source
  và URL trang.
- `GET /api/jobs/:id/result/pages/:page` trả ảnh PNG nằm trong run directory.
- Backend typecheck pass và 48/48 test pass.
- Frontend TypeScript/Vite build pass.

## Kiểm thử trình duyệt

Đã kiểm thử bằng Chrome headless với Firebase Authentication thật và API fixture:

- mở đúng result player của job hoàn tất;
- hiển thị 2 chapter và coverage 100%, 2/2 trang, 3 nguồn;
- chọn chapter thứ hai và player chuyển sang chapter đó;
- chọn nguồn Trang 2 và hiển thị ảnh có nhãn `Trang nguồn 2`;
- không có console error hoặc page error.

Tài khoản Firebase QA và document profile được tạo riêng cho lượt test đã được
xóa sau khi hoàn tất.
