# Đánh giá Module 2 — Lecture-02-Process.pdf

Ngày đánh giá: 2026-07-30  
Model: `gemini-3.5-flash` trên Vertex AI  
Chế độ: `FULL`, đối tượng `beginner`, ngôn ngữ `vi`  
Giới hạn chapter: 8 phút

## Kết quả định lượng

- PDF đầu vào: 45 trang.
- Source Registry đầu vào: 50 source.
- Lecture plan: 8 chapter, 48 item.
- Thời lượng ước lượng: 2.120 giây, tương đương 35 phút 20 giây.
- Chapter dài nhất: 373 giây, tương đương 6 phút 13 giây.
- Coverage: 45/45 trang và 50/50 source, `coverage_rate = 1`.
- Treatment: 24 `EXPLAIN`, 16 `SHOW`, 2 `MENTION`, 6 `REFERENCE`.
- Không có source bị bỏ sót hoặc gán lặp.
- 5/5 source loại `CODE` được gán `EXPLAIN`.
- Gemini tạo plan hợp lệ ngay attempt đầu tiên.
- Lần chạy có cache hoàn tất Module 1–2 trong khoảng 2,6 giây.

## Đánh giá cấu trúc

Thứ tự 8 chapter hợp lý và giữ được prerequisite:

1. Giới thiệu và khái niệm tiến trình.
2. Phân loại và trạng thái tiến trình.
3. PCB, `task_struct`, CPU burst và I/O burst.
4. Lập lịch và chuyển ngữ cảnh.
5. Tạo tiến trình bằng `fork()`, `exec()`, `wait()`.
6. Kết thúc tiến trình, zombie, orphan và kiến trúc Chrome.
7. Thực hành `fork1.c`, `fork2.c`.
8. Thực hành `fork3.c` và tổng kết.

Cấu trúc đi từ khái niệm nền tảng sang cơ chế hệ điều hành, sau đó mới tới mã
nguồn thực hành. Các slide mục lục, bìa và tài liệu tham khảo được giảm trọng số
bằng `REFERENCE`; sơ đồ và ảnh kết quả terminal được ưu tiên `SHOW`; nội dung
khái niệm và code được `EXPLAIN`.

## Source và warning

- Mỗi item có `source_ids`, `page_numbers` và lý do chọn treatment.
- Mỗi chapter có source/page manifest riêng.
- Hai warning từ Module 1 ở trang 11–12 về ảnh chụp có chữ nhỏ được giữ nguyên
  trong lecture plan.
- Không có trang được đánh dấu `UNREADABLE` hoặc `DUPLICATE` trong tài liệu này.
  Hai nhánh này đã được kiểm thử bằng fixture riêng.

## Kết luận

Module 2 đạt yêu cầu để làm đầu vào cho Script Generator: plan có cấu trúc hợp
lý, đầy đủ traceability, kiểm soát thời lượng và không bỏ âm thầm nội dung trong
chế độ `FULL`.

Rủi ro còn lại cần đo ở Module 5B: duration hiện là estimate theo 125 từ/phút và
thời gian quan sát visual. Sau khi có audio TTS thật, cần lưu sai lệch estimate so
với audio để hiệu chỉnh hệ số.
