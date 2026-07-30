# Đánh giá Module 6 — Lecture-02-Process.pdf

Ngày chạy: 2026-07-30  
Run kiểm tra cache cuối: `runs/2026-07-30T07-01-55-341Z`

## Kết quả đầu ra

| Chỉ số | Kết quả |
|---|---:|
| Trang PDF | 45 |
| Chapter / scene | 8 / 84 |
| Segment render thành công | 84/84 |
| Duration video | 908,121 giây |
| Resolution / FPS | 1920×1080 / 30 |
| Video / audio codec | H.264 / AAC |
| Kích thước MP4 | 31.312.435 byte |
| Subtitle cue | 248 |
| Coverage rate | 100% |
| Scene `FAILED` | 0 |

Artifact chính:

- `runs/2026-07-30T07-01-55-341Z/lecture.mp4`
- `runs/2026-07-30T07-01-55-341Z/lecture.srt`
- `runs/2026-07-30T07-01-55-341Z/coverage-report.json`
- `runs/2026-07-30T07-01-55-341Z/06_video_manifest.json`

## QA đã thực hiện

- Timeline lấy duration WAV thật, căn theo frame 30 fps.
- Thêm 0,6 giây nghỉ ở bảy ranh giới chapter.
- Tám chapter timestamp tăng đúng và nằm trong duration video.
- Subtitle có timestamp tăng dần, không chồng lấn, tối đa hai dòng × 48 ký tự,
  không lộ source ID.
- FFprobe xác nhận MP4 có cả video/audio stream, H.264/AAC, 1920×1080, 30 fps.
- Duration FFprobe khớp timeline trong tolerance 0,2 giây.
- SHA-256 được ghi cho MP4, SRT và coverage report.
- Ba frame ở chapter 1, 4 và 8 đã được mở kiểm tra trực quan; không thấy frame
  đen, lỗi font tiếng Việt hoặc sai resolution.
- Chạy lại đạt cache hit 84/84 segment và hoàn thành trong khoảng 12 giây.
- Bộ test tự động pass 42/42, gồm integration test tạo MP4 ngắn và test chặn
  scene `FAILED`.

## Warning và giới hạn còn lại

Manifest giữ một warning tổng hợp vì có bảy voice scene lệch duration estimate
trên 50%; đây không phải lỗi media. Timeline đã dùng duration thật nên video
không bị cắt voice.

MVP hiện dùng PNG đã render từ Module 5A làm slide tĩnh trong mỗi scene. Duration
visual đã đồng bộ với voice, nhưng chưa có animation nội cảnh hoặc transition
chuyển động. Subtitle được xuất thành file SRT rời, chưa burn vào hình.

Chưa có human watch/listening evaluation toàn bộ video và chưa chạy golden PDF
set, vì vậy chưa nên tuyên bố đạt chất lượng production.
