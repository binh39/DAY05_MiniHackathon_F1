# LectureAI Frontend

React + TypeScript SPA cho hệ thống chuyển PDF thành video bài giảng.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:4173`. Có thể dùng tài khoản demo đã điền sẵn trên trang
đăng nhập hoặc đăng ký một tài khoản mới.

## Build production

```bash
npm run build
npm run preview
```

## Các màn hình

- `/login`: đăng nhập.
- `/register`: đăng ký.
- `/app/create`: upload PDF và cấu hình video.
- `/app/documents`: thư viện tài liệu.
- `/app/videos`: thư viện video và trạng thái xử lý.

Hiện frontend dùng `localStorage` và dữ liệu demo để các luồng tương tác hoạt
động độc lập. Khi backend sẵn sàng, thay phần lưu trữ trong `src/contexts.tsx`
bằng Firebase Auth, Firestore/Storage và API tạo job.
