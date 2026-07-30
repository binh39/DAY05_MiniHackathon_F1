# Đánh giá Module 5B — Lecture-02-Process.pdf

Ngày chạy: 2026-07-30  
Run kiểm tra cuối: `runs/2026-07-30T06-40-59-921Z`

## Kết quả

| Chỉ số | Kết quả |
|---|---:|
| Trang PDF đầu vào | 45 |
| Chapter / narration / scene | 8 / 84 / 84 |
| Audio WAV tạo được | 84/84 |
| Scene `READY` | 77 |
| Scene `WARNING` | 7 |
| Scene `FAILED` | 0 |
| Voice | `vi-VN-Neural2-A` |
| Format | LINEAR16/WAV PCM mono 16-bit |
| Sample rate | 24.000 Hz |
| Tổng duration audio thực | 902,56 giây |
| Duration storyboard ước tính | 1.634 giây |
| Sai lệch tổng | -44,8% |
| Tổng dung lượng audio | 43.326.486 byte |

Manifest cuối: `runs/2026-07-30T06-40-59-921Z/05b_voice_manifest.json`.

## Những gì đã xác minh

- Google Cloud xác nhận voice trước khi chạy batch.
- Mỗi storyboard scene có đúng một WAV và đúng `narration_id`.
- Toàn bộ WAV có header RIFF/WAVE hợp lệ, PCM mono 16-bit, 24 kHz.
- SHA-256, duration và sample rate được đọc lại từ file rồi đối chiếu manifest.
- Không có scene bị thiếu, trùng hoặc thừa.
- SSML loại source ID, escape XML, áp dụng pronunciation glossary và pause theo
  loại narration.
- Chạy lại đạt cache hit 84/84, không gọi TTS lại.
- Smoke test thật tạo `eval/voice-smoke/vi-VN-Neural2-A.wav`, dài 4,02 giây.
- Bộ test tự động pass 39/39; riêng Module 5B kiểm tra SSML, WAV, cache, retry và
  final fallback.

## Warning và nhận định

Bảy scene có duration thực ngắn hơn estimate trên 50%:
`scene_0003`, `scene_0018`, `scene_0042`, `scene_0043`, `scene_0048`,
`scene_0051`, `scene_0059`. Đây không phải lỗi TTS; file vẫn hợp lệ. Module 6
phải lấy duration thật từ voice manifest để đồng bộ hình, không dùng estimate.

Sai lệch tổng -44,8% cho thấy bộ duration estimator ở Module 2–3 đang dự báo
khá bảo thủ so với tốc độ đọc thực. Trước khi chốt UX thời lượng video, nên hiệu
chỉnh estimator từ dữ liệu audio này hoặc giảm `speaking_rate` sau human listening
test.

## Chưa được xem là hoàn thành

- Chưa có human listening evaluation về phát âm, nhịp nghỉ và độ tự nhiên trên
  mẫu đại diện.
- Chưa chạy đủ golden PDF set.
- Chưa đo chi phí API chính xác theo từng run.
- Chưa đồng bộ audio với video; đây là trách nhiệm Module 6.
