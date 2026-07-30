# Đánh giá Module 3 — Lecture-02-Process.pdf

Ngày đánh giá: 2026-07-30  
Model: `gemini-3.5-flash` trên Vertex AI  
Đầu vào: lecture plan 8 chapter, 45 trang, 50 source  
Ngôn ngữ script: tiếng Việt

## Kết quả định lượng

- 8/8 chapter có script.
- 84 narration, thời lượng đọc ước lượng 1.634 giây (27 phút 14 giây).
- Lecture plan ước lượng 35 phút 20 giây vì còn bao gồm thời gian quan sát visual.
- 49 `GROUNDED_CLAIM`.
- 17 `TRANSITION`.
- 8 `TEACHING_ANALOGY`.
- 2 `EXAMPLE`.
- 8 `LEARNING_CHECK`, mỗi chapter có một learning check cuối phần.
- 44/44 source có treatment `EXPLAIN`, `MENTION` hoặc `SHOW` được grounded.
- Không có grounded claim thiếu source.
- Không có learning objective bị bỏ sót.
- 41 thuật ngữ trong pronunciation glossary.
- Không narration nào vượt 90 từ hoặc duration chapter trong lecture plan.
- Semantic review đạt ngay vòng đầu trên bản prompt v2.
- Lần chạy Module 1–3 có cache hoàn thành trong khoảng 2,7 giây.

## Đánh giá trải nghiệm nghe

Bản prompt đầu tiên tạo lời chào lặp lại ở đầu mỗi chapter. Prompt v2 đã sửa:

- Chỉ chapter đầu mở bằng lời chào.
- Bảy chapter sau mở bằng câu nối ý từ phần trước.
- Mỗi chapter có recap grounded ngay trước learning check.
- Narration ngắn, trọn câu và phù hợp để chuyển thành scene.

Thứ tự lời giảng giữ đúng lecture plan: khái niệm tiến trình, trạng thái, PCB,
lập lịch, tạo/kết thúc tiến trình và ba bài thực hành `fork`.

## Grounding và retry

Validator deterministic kiểm tra:

- Grounded claim phải có element-level `source_id`.
- Source và item phải thuộc đúng chapter.
- Source có cùng trang nhưng sai element vẫn bị chặn.
- Mọi source cần dạy phải xuất hiện trong grounded claim.
- Mọi learning objective phải có narration xử lý.
- Transition không được gắn citation giả.

Sau bước này, Gemini semantic reviewer so từng grounded claim với excerpt của
source và phân loại `UNSUPPORTED`, `WRONG_SOURCE`, `CONTRADICTION`. Trong lần
evaluation v1, reviewer yêu cầu sửa một narration của chapter lập lịch; hệ thống
chỉ sinh lại chapter đó và vượt qua review lần hai. Bản prompt v2 vượt review
ngay lần đầu.

## Kết luận và giới hạn

Artifact đạt yêu cầu để làm đầu vào cho Storyboard Generator. Citation,
objective coverage, pacing và glossary đều có traceability.

Pronunciation glossary hiện là đề xuất của Gemini. Module 5B vẫn cần chuẩn hóa
theo voice TTS thật và nghe thử các thuật ngữ như `fork`, `task_struct`,
`context switch` trước khi render video cuối.
