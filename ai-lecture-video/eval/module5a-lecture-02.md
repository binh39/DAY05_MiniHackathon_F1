# Đánh giá Module 5A — Lecture-02-Process.pdf

Ngày đánh giá: 2026-07-30  
Renderer: `remotion@4.0.501`  
Kích thước: 1920×1080  
Đầu vào: 84 storyboard scene

## Kết quả định lượng

- 84/84 scene có PNG visual.
- 84 `READY`, 0 `WARNING`, 0 `FAILED`.
- Không thiếu file.
- 84/84 asset đúng kích thước 1920×1080.
- 84/84 SHA-256 checksum khớp visual manifest.
- Lần render hoàn chỉnh sau khi browser đã sẵn sàng: khoảng 56 giây.
- Cache hit toàn bộ 84 scene; pipeline Module 1–5A chạy khoảng 5,47 giây.

## Template đã render

- 8 `TITLE`.
- 28 `ORIGINAL_PAGE`.
- 36 `BULLET`.
- 4 `DIAGRAM`.
- 8 `SUMMARY`.
- `CROP_AND_HIGHLIGHT` được render bằng fixture riêng vì PDF thật chưa có bbox.

Các mẫu đã được mở kiểm tra trực quan:

- `scene_0001`: title tiếng Việt.
- `scene_0002`: trang PDF gốc với caption.
- `scene_0003`: bullet layout.
- `scene_0007`: diagram layout.
- `scene_0008`: chapter summary.
- `eval/visual-smoke/crop-highlight.png`: crop/highlight smoke.

## Lỗi phát hiện nhờ visual QA

Lần render đầu tiên tạo 84 file hợp lệ về kỹ thuật nhưng tất cả đều hiển thị
`defaultProps` “Preview”. Nguyên nhân là composition chỉ được resolve một lần
trước khi truyền props từng scene. Manifest và checksum không thể phát hiện lỗi
nội dung này.

Đã sửa bằng cách gọi `selectComposition` với input props của từng scene và tăng
renderer cache version để vô hiệu hóa toàn bộ ảnh sai. Bản sau sửa đã được mở
kiểm tra trực quan.

Smoke crop lần đầu cũng đặt bbox theo toàn container, chưa trừ letterbox của ảnh
`contain`. Renderer hiện tính kích thước ảnh hiển thị, offset và scale từ kích
thước nguồn trước khi chiếu bbox.

## Layout và fallback

- Safe area 72 px.
- Theme text/background đạt contrast lớn hơn 4.5:1.
- QA cảnh báo text block trên 180 ký tự hoặc tổng scene trên 650 ký tự.
- Primary render retry hai lần.
- Nếu vẫn lỗi, scene được render bằng bullet fallback và đánh `WARNING`.
- Cache key bỏ `image_path` chứa run ID nhưng vẫn gắn với document checksum,
  visual props, narration, kích thước và renderer version.

## Giới hạn

- Đây là static visual asset tại frame đại diện; animation/timing cuối sẽ được
  Module 6 render theo audio duration thật.
- PDF đại diện chưa có bbox thật, nên chất lượng crop trên tài liệu thực cần
  đánh giá lại sau khi Module 1 có layout extraction.
- Chưa chạy đủ golden set.
