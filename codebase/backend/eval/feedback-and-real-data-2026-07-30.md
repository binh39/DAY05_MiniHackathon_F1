# Feedback và real-data UI evaluation — 2026-07-30

## Real-data UI

- Xóa `frontend/src/data.ts` và toàn bộ seed document/video.
- Xóa hai localStorage key cũ để dữ liệu demo không còn sót trên trình duyệt.
- Documents và videos chỉ được dựng từ `/api/jobs` của user đã đăng nhập.
- Số video, dung lượng PDF và tổng thời lượng được tính từ metadata job thật.
- Gỡ các thao tác xóa/chia sẻ giả chưa có backend tương ứng.

## Feedback

- `GET /api/jobs/:id/feedback` đọc feedback đã lưu.
- `PUT /api/jobs/:id/feedback` validate và upsert feedback theo job.
- Feedback gồm rating, accuracy, clarity, duration fit, ý định dùng lại,
  nội dung khó hiểu/sai và góp ý tự do.
- JobStore lưu feedback vào metadata local và mirror sang Firestore.
- Hai endpoint yêu cầu Firebase ID token, job hoàn tất và đúng `owner_uid`.

## Kết quả kiểm thử

- Backend typecheck và 48/48 test pass.
- Test API xác minh invalid payload bị từ chối, feedback lưu/đọc lại được và
  user khác nhận 404.
- Frontend TypeScript/Vite build pass.
- Browser QA xác minh:
  - API rỗng hiển thị empty state, không có seed card;
  - job thật xuất hiện sau khi API trả dữ liệu;
  - gửi rating 4/5 và nội dung góp ý thành công;
  - không có console error hoặc page error.
- Tài khoản Firebase QA và profile Firestore tạm đã được xóa sau kiểm thử.
