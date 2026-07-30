# LectureAI Frontend

React + TypeScript SPA cho hệ thống chuyển PDF thành video bài giảng.

## Chạy local

Khởi động API ở terminal thứ nhất, từ thư mục gốc `ai-lecture-video`:

```bash
npm install
npm run serve:api
```

Khởi động frontend ở terminal thứ hai:

```bash
npm install
npm run dev
```

Mở `http://localhost:4173`. Frontend gọi API mặc định tại
`http://127.0.0.1:8787/api`. Có thể copy `.env.example` thành `.env` để đổi URL.

Upload PDF, trạng thái xử lý, retry/cancel và tải MP4/SRT hiện dùng backend thật.
Đăng nhập, đăng ký, giữ phiên và reset password dùng Firebase Authentication.
Mỗi request API gửi Firebase ID token; backend chỉ trả job của đúng user.

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
- `/app/videos`: thư viện video, trạng thái xử lý và result player có chapter/source navigation.
- `/app/outline/:jobId`: preview document analysis, chỉnh và duyệt outline.

Thư viện không dùng seed/mock data. Tài liệu, video, trạng thái, số trang, dung
lượng và thời lượng chỉ được dựng từ job backend của user hiện tại. Job được
đồng bộ mỗi ba giây và có video player/download thật khi pipeline hoàn tất.

Job mới dừng sau Module 2. Khi card chuyển sang “Chờ duyệt”, user mở outline để
đổi tiêu đề, mục tiêu, thứ tự và mức chi tiết chapter. Nút “Duyệt và tạo video”
tiếp tục pipeline từ Module 3.

Khi video hoàn tất, result player tải timestamp và coverage thật từ backend.
Người dùng có thể nhảy tới từng chapter, xem coverage và mở đúng ảnh trang PDF
được dùng làm nguồn cho chapter đang phát.

Result player có form đánh giá tổng thể, độ chính xác, độ dễ hiểu, thời lượng,
ý định dùng lại và hai ô góp ý. Feedback được validate ở backend, lưu cùng job
và mirror sang Firestore; user khác không thể đọc hoặc sửa.

Firebase config web nằm trong `.env`; file mẫu `.env.example` chứa các giá trị
public của Firebase Web App. Không đặt service-account key trong frontend.
