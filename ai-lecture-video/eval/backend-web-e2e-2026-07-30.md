# Backend + Web E2E — 2026-07-30

## Phạm vi

Kiểm thử local API, job runner, artifact serving và frontend bằng một PDF thật
`inputs/example.pdf`. Firebase chưa nằm trong phạm vi kiểm thử này.

## Kết quả API

- Job hoàn tất: `41970fff-8387-4525-bc56-7be4228948d0`.
- Pipeline hoàn tất ở attempt 5 sau khi bổ sung kiểm soát duration cho script và
  deterministic fallback cho visual route không đủ source/structure.
- Video MP4 trả HTTP 200, `video/mp4`, 2.122.890 byte.
- Subtitle trả HTTP 200, `application/x-subrip`, 2.164 byte.
- Coverage trả HTTP 200, JSON, 3.956 byte.
- Thumbnail trả HTTP 200, PNG, 562.534 byte.
- Video được browser decode với duration `67,454362` giây và `readyState = 4`.
- Public job response không lộ `input_file` hoặc local run path.
- Retry đã đưa job lỗi/hủy về queue với attempt mới.
- Cancel đã được xác minh trên job
  `96226e87-055f-4676-aba0-703c41d75ccc`.

## Kết quả frontend

- Frontend đọc job thật từ API và poll trạng thái mỗi ba giây.
- Upload PDF thật qua trang Create tạo job mới và hiển thị processing.
- Cancel từ giao diện chuyển job sang trạng thái cancelled/failed có retry.
- Job hoàn tất mở được video thật trong player.
- Link tải MP4 và SRT trỏ tới artifact endpoint an toàn.
- Không có console error hoặc page error trong phiên browser test.

## Phần chưa hoàn thành

- Progress theo byte khi upload.
- Feedback có cấu trúc.
- Timeout/retry riêng cho từng module; hiện mới có timeout toàn pipeline.
