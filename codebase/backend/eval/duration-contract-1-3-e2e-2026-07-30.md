# Duration contract E2E — option 1–3 phút

## Input

- PDF: `inputs/Lecture-02-Process.pdf`
- 45 trang, 51 source
- Duration option: `1-3`
- Contract: min 60s, max 180s, target 145s
- Language: `vi`
- Voice: `vi-VN-Neural2-A`
- Visual style: `academic`
- Run: `runs/duration-smoke-1-3-20260730`

## Kết quả

| Stage | Duration |
|---|---:|
| Lecture plan | 145s |
| Script estimate | 125s |
| Google TTS thực tế | 74.42s |
| MP4 cuối | 75.82s |

Video cuối nằm trong khoảng bắt buộc 60–180 giây. Pipeline tạo 3 chapter, 11
scene và account đủ 51 source. Nội dung ít ưu tiên được gán `OUT_OF_SCOPE` thay
vì kéo dài video.

Module 5A có 3 warning do scene DIAGRAM không có cấu trúc diagram phù hợp và đã
fallback sang ảnh trang gốc. Module 5B không có scene lỗi; Module 6 hoàn tất.
Style `academic` đã được render thật và kiểm tra trực quan; font tiếng Việt hiển
thị đầy đủ dấu sau khi tăng renderer cache version.

## Automated verification

- Backend unit/integration: 55/55 pass.
- Frontend production build: pass.
- Dependency audit backend/frontend: 0 vulnerability.
- Final duration gate từ chối output ngoài khoảng nếu độ lệch quá lớn để hiệu
  chỉnh tốc độ audio an toàn.
