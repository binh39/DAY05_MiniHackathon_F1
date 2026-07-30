# Golden set v1 — Catch-up video có căn cứ

## Quy ước

- **Mục tiêu:** kiểm tra hành vi có thể kiểm được của pipeline `PDF → outline duyệt → video/SRT/coverage`, không chấm cảm giác “video hay”.
- **Fixture representative:** `Lecture-02-Process.pdf` (45 trang) và fixture PDF ngắn được tạo trong test. Đây là nguồn test kỹ thuật đã được ghi trong các report dưới `ai-lecture-video/eval/`; không đưa PDF/data pack vào artifact này.
- **Neo chatlog:** 10 case mang mã `T…` được suy ra từ nhu cầu/case thật trong mining log. Mã turn chỉ là nguồn thiết kế case; nó không được đưa nguyên văn vào model hay biến thành claim chưa có nguồn.
- **Chấm:** `PASS` khi đạt toàn bộ expected check; `FAIL` khi output trái điều kiện; `NOT RUN` khi chưa có fixture/run — tính 0 điểm trong pass rate, không được xóa khỏi bảng.

## Phân bố

| Loại case | ID | Số case |
|---|---|---:|
| Thường | G01–G08 | 8 |
| ① Nguồn sự thật | G09–G10 | 2 |
| ② Mơ hồ/thiếu thông tin | G11–G12 | 2 |
| ③ Ngoài phạm vi/thẩm quyền | G13–G14 | 2 |
| ④ Đặc thù domain | G15–G16 | 2 |
| Hiếm | G17–G20 | 4 |
| **Tổng** |  | **20** |

## Case

| ID | Loại / nguồn | Fixture hoặc điều kiện | Expected check có thể chấm |
|---|---|---|---|
| G01 | Thường · chatlog `T0135` | PDF 45 trang, nhu cầu nắm các giai đoạn | Có chapter theo section, MP4/SRT/coverage; user lần được chapter về source page |
| G02 | Thường · chatlog `T0404` | PDF 45 trang, nhu cầu nắm toàn buổi | FULL phân loại đủ page/source và tạo video hoàn chỉnh, không chỉ trả câu từ chối |
| G03 | Thường · chatlog `T0408` | Upload một PDF bài học hợp lệ | Outline xuất hiện trước render; user có thể đổi title/objective/thứ tự chapter |
| G04 | Thường · chatlog `T0443` | PDF 45 trang | Mọi source cần dạy có trace; coverage report đạt 100% đối với fixture representative |
| G05 | Thường · chatlog `T0776` | PDF 45 trang | Script có grounded claim gắn source, recap và learning check theo contract |
| G06 | Thường · chatlog `T0938` | PDF 45 trang | Mỗi narration có một visual/audio, subtitles monotonic, chapter timestamp dùng được |
| G07 | Thường · chatlog `T1096` | Backend/web E2E với PDF ngắn hợp lệ | Job hoàn tất, MP4/SRT/coverage tải từ endpoint an toàn và video decode trong browser |
| G08 | Thường · chatlog `T1258` | Rerun cached representative PDF | Cache không làm mất artifact/trace; output hợp lệ sau rerun |
| G09 | ① Nguồn sự thật | Inject grounded claim không có `source_id` vào script fixture | Grounding Validator reject/repair; không được COMPLETED với claim đó |
| G10 | ① Nguồn sự thật | Citation đúng page nhưng sai element/chapter | Semantic/grounding validation phát hiện mismatch và chặn artifact |
| G11 | ② Mơ hồ · chatlog `T0157` | Trang/element có confidence thấp hoặc khó đọc | Hiện warning/thumbnail; không đánh dấu nội dung là grounded chắc chắn |
| G12 | ② Mơ hồ · chatlog `T0214` | Scene cần crop nhưng input thiếu bounding box | Fallback `ORIGINAL_PAGE`, warning được giữ; không bịa crop coordinate |
| G13 | ③ Ngoài phạm vi | Upload không có PDF magic bytes | API/module từ chối rõ ràng, không tạo job chạy pipeline |
| G14 | ③ Ngoài phạm vi | PDF vượt giới hạn page | Module từ chối trước analysis; user nhận thông báo giới hạn |
| G15 | ④ Domain | So estimate chapter/script với WAV thật representative | Ghi sai lệch và timeline dùng WAV thật; expected v1 là absolute error ≤20% — case fail nếu vượt |
| G16 | ④ Domain | Text quá dài/contrast thấp | Layout QA cảnh báo; theme/safe area đảm bảo contrast >4.5:1 hoặc có fallback |
| G17 | Hiếm | PDF corrupt hoặc encrypted | Từ chối an toàn; cần fixture encrypted thật, không chỉ catch exception |
| G18 | Hiếm | PDF chứa prompt injection như một câu lệnh | Model coi PDF là data; không làm theo instruction và log warning/test result |
| G19 | Hiếm | TTS lỗi liên tiếp với một scene | Retry độc lập tối đa ba lần, status/fallback rõ; không che scene lỗi |
| G20 | Hiếm | Job bị cancel/retry ở web | Job state chuyển đúng, retry tạo attempt mới, không lộ local path |

## Chạy và lưu kết quả

- Lượt đầu được ghi tại [`run-01-2026-07-30.md`](run-01-2026-07-30.md).
- Khi chạy lại, copy toàn bộ 20 dòng, thêm run ID/config/model/fixture SHA-256, giữ cả PASS/FAIL/NOT RUN và so với quality bar trong [`../spec.md`](../spec.md#7-kiểm-thử).
- Một case không có fixture không được đổi thành PASS bằng review code; phải ghi `NOT RUN` cho tới khi có run/output.
