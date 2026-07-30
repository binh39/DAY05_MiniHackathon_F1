# Đánh giá Module 4 — Lecture-02-Process.pdf

Ngày đánh giá: 2026-07-30  
Model: `gemini-3.5-flash` trên Vertex AI  
Đầu vào: 8 chapter, 84 narration, 1.634 giây

## Kết quả định lượng

- 84/84 narration có đúng một scene.
- 84 scene, tổng duration 1.634 giây; duration delta bằng 0.
- Không có narration bị thiếu hoặc gán lặp.
- Không có source ID không tồn tại hoặc source ngoài narration.
- 8 `TITLE`.
- 28 `ORIGINAL_PAGE`.
- 36 `BULLET`.
- 4 `DIAGRAM`.
- 8 `SUMMARY`.
- 56 generated layout và 28 page-image asset plan.
- Không còn warning trong artifact cuối.
- Cache hit toàn Module 1–4 trong khoảng 2,69 giây.

## Template và routing

Registry hỗ trợ đủ sáu template:

1. `TITLE`
2. `ORIGINAL_PAGE`
3. `CROP_AND_HIGHLIGHT`
4. `BULLET`
5. `DIAGRAM`
6. `SUMMARY`

Gemini chỉ trả route, source, heading, key point và cấu trúc diagram. Template
name, props, asset path, crop instruction và fallback được tạo deterministic.
Response schema không có trường animation code, CSS, SVG hoặc template props tùy
ý.

Trong PDF đại diện, Module 1 chưa có bounding box nên không scene nào được phép
chọn crop. `CROP_AND_HIGHLIGHT` đã được kiểm thử với fixture có bbox; khi bbox
thiếu, builder tự hạ xuống `ORIGINAL_PAGE` và ghi warning.

## Retry và fallback

Trong evaluation đầu tiên, Gemini chọn `DIAGRAM` cho narration kiến trúc Chrome
nhưng source là text/image, không phải diagram. Validator từ chối chapter đó;
Gemini chỉ route lại chapter liên quan và kết quả sau retry hợp lệ.

Mỗi scene có fallback:

- Visual dựa trên source fallback về nguyên trang.
- Generated layout fallback về bullet đơn giản.
- Crop thiếu bbox fallback về nguyên trang.

## Cache

Audit cache phát hiện page asset path chứa `run_id`, làm cache key ban đầu thay
đổi ở mọi lần chạy. Cache v2 đã loại path khỏi identity và rebase đường dẫn asset
về run hiện tại khi đọc. Regression test xác minh `image_path` và
`asset_plan.source_path` đều trỏ đúng run mới.

## Kết luận và giới hạn

Storyboard đủ điều kiện làm đầu vào cho Module 5A/5B: mapping 1–1, props có
schema, source traceability đầy đủ và asset plan rõ ràng.

Giới hạn còn lại là crop/highlight thực tế chưa thể đánh giá trên PDF này cho
đến khi Module 1 cung cấp bounding box hoặc layout extraction.
