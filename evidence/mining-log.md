# Mining log — nhu cầu catch-up/tổng hợp bài học

## Mục đích và giới hạn

Log này làm bằng chứng **B (mining)** cho problem ở [`../spec.md`](../spec.md), không phải khảo sát và không suy rộng thành nhu cầu ưu tiên xem video. Nó chỉ chứng minh rằng một nhóm học viên có nhu cầu tổng hợp/catch-up và tutor hiện có đôi khi không phục vụ được job đó.

Nguồn là `data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv`, chỉ dùng trong phạm vi hackathon. File này **không được copy ra ngoài**; bên dưới chỉ có mã turn ẩn danh và các trích dẫn tối thiểu theo luật repo.

| Thuộc tính nguồn | Giá trị |
|---|---|
| SHA-256 | `400ce4ce5c1c58189be9ca0630bd517ca69cfcac637f0f802edec70f4f796cad` |
| Kích thước | 2.522 message = 1.261 lượt học viên–tutor |
| Người dùng/hội thoại | 369 học viên ẩn danh / 585 hội thoại |
| Thời gian | 22–29/07/2026 |
| Phạm vi | Chỉ VLearn `in_class`; không đại diện toàn bộ hành vi trước/sau buổi học |

## Phương pháp đếm có thể kiểm lại

1. Đọc CSV bằng `Import-Csv`; mỗi `turn_id` phải có một message `student` và một message `tutor`.
2. Đếm lượt có ngữ cảnh đã chọn bằng `student.content` khớp `^\(Trang\s+\d+,`.
3. Đếm nhu cầu tổng hợp bằng `student.content` khớp không phân biệt hoa thường `tóm tắt|tổng hợp`.
4. Với các turn ở bước 3, đánh dấu **refusal rõ về tổng hợp** khi `tutor.content` khớp `không (thể|tìm thấy|có).*?(tóm tắt|tổng hợp)`. Rule này cố ý hẹp để không gọi mọi câu “xin lỗi” là refusal.
5. Mã sau tái tạo các số trong bảng; không gửi CSV tới service ngoài.

```powershell
$rows = Import-Csv data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv
$tutors = @{}
$rows | Where-Object role -eq 'tutor' | ForEach-Object { $tutors[$_.turn_id] = $_ }
$students = $rows | Where-Object role -eq 'student'
$withSelectedContext = @($students | Where-Object {
  $_.content -match '^\(Trang\s+\d+,'
} | Select-Object -ExpandProperty turn_id -Unique)
$summaryTurns = @($students | Where-Object {
  $_.content -match '(?i)tóm tắt|tổng hợp'
} | Select-Object -ExpandProperty turn_id -Unique)
$summaryRefusals = @($summaryTurns | Where-Object {
  $tutors[$_].content -match '(?i)không (thể|tìm thấy|có).*?(tóm tắt|tổng hợp)'
})
"selected=$($withSelectedContext.Count); summary=$($summaryTurns.Count); refusal=$($summaryRefusals.Count)"
```

## Kết quả

| Tín hiệu | Kết quả | Diễn giải đúng mức |
|---|---:|---|
| Lượt có ngữ cảnh trang/đoạn | 1.252/1.261 (99,3%) | Người học thường đã chỉ ra nơi đang vướng; không suy ra họ đều muốn video |
| Lượt có từ khóa tổng hợp | 141/1.261 (11,2%) | Có nhu cầu lặp lại đủ để điều tra job catch-up |
| Refusal rõ về tổng hợp trong tập trên | 49/141 (34,8%) | Một phần đáng kể không nhận được câu trả lời tổng hợp trực tiếp theo rule hẹp |
| Tutor không có citation | 582/1.261 (46,2%) | Lý do cần kiểm nguồn; không đồng nghĩa mọi câu trả lời đó sai |

## Năm ví dụ nguyên văn tối thiểu

| Turn | Trích dẫn học viên (đã rút ngắn) | Kết quả tutor |
|---|---|---|
| `T0135` | “tóm tắt nội dung các giai đoạn được mô tả trên slide” | Không tìm được nội dung giai đoạn/biểu đồ; downvote |
| `T0404` | “Tổng họp thông tin của toàn bộ bài giảng hôm nay” | Không thể truy xuất nội dung tổng hợp; downvote |
| `T0443` | “tóm tắt toàn bộ slide” | Không trả về tóm tắt tổng quát; downvote |
| `T0776` | “giải thích và tóm tắt nội dung học hôm này” | Không tìm thấy phần tóm tắt tổng quát; downvote |
| `T0938` | “tóm tắt tất cả nội dung cần note lại đầy đủ” | Không truy cập nội dung slide để tóm tắt; downvote |

Các trích dẫn trên là ví dụ hành vi, không phải định danh người học. Khi demo, chỉ dùng mã turn và câu rút ngắn này; không chiếu hoặc export toàn bộ CSV.

## Giới hạn cần đóng ở CP5

- Chưa biết user thích catch-up bằng video, text map hay hỏi đáp; phải quan sát task thật, không hỏi dẫn dắt “bạn có muốn video AI không?”.
- Chưa có số phút bị mất hoặc tỷ lệ hoàn thành học tập; không được tự gán ROI.
- Bằng chứng không cho phép kết luận về học viên ngoài VLearn/in-class hoặc người dùng không xuất hiện trong log.
