# Firebase integration — 2026-07-30

## Cloud resources

- Project: `project-5d300c02-d165-4037-b6f`.
- Web app: `AI Lecture Video`.
- Email/Password Authentication: enabled.
- Firestore `(default)`: `asia-southeast1`, Native mode, delete protection.
- Storage:
  `project-5d300c02-d165-4037-b6f.firebasestorage.app`,
  `ASIA-SOUTHEAST1`, Standard.
- Firestore và Storage rules đã compile và deploy thành công.

## Security model

- Frontend dùng Firebase Auth và gửi ID token trong Authorization Bearer header.
- Backend xác minh token bằng Firebase Secure Token signing certificates,
  audience và issuer.
- Mọi job có `owner_uid`; list/get/cancel/retry/artifact đều kiểm tra owner.
- Firestore client chỉ đọc job có `owner_uid` trùng UID; client không được sửa
  job.
- Storage client chỉ đọc dưới `users/{uid}/jobs/...`; client không được ghi.
- Backend dùng ADC để mirror metadata/file và tự kiểm soát authorization.

## Live verification

- Đăng ký Firebase account thật qua browser thành công và tạo user profile trên
  Firestore.
- Refresh trang vẫn giữ phiên đăng nhập.
- `GET /api/jobs` với Firebase ID token trả HTTP 200.
- Upload `inputs/example.pdf` qua browser tạo job
  `56cebc95-8f57-4a7c-a15b-5d276669b2b1`.
- PDF 2.285 byte đã xuất hiện tại Storage path theo UID/job.
- Firestore job có owner email, storage URI và trạng thái `CANCELLED` sau khi
  bấm hủy trên giao diện.
- Truy cập không token vào Firestore job và Storage object đều trả HTTP 403.
- Browser test không có console/page error sau khi sửa token verifier.

## Automated verification

- Backend: 46/46 test pass, gồm auth-required và owner isolation.
- Frontend TypeScript/build pass.
- Root và frontend `npm audit`: 0 vulnerability.

## Còn lại

- Google/Microsoft sign-in chưa bật; nút đã được disable và ghi “Sắp ra mắt”.
- Chưa có quota phút/token theo user.
- Chưa có UI xóa job và toàn bộ cloud/local artifact.
- App Check chưa được cấu hình.
