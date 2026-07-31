# SCRIPT PITCHING — VLearn Video Catch-up

**Tổng thời lượng:** 5 phút 30 giây  
**Quy ước:** chữ trong `[ngoặc vuông]` là thao tác, không đọc thành lời.

---

## Slide 1 — User & Job · 0:00–0:45

> Job executor của chúng tôi là: **Học viên đã học xong một buổi, và muốn ôn lại nội dung chính của buổi học.** Khi cần ôn trước quiz, bạn ấy thường phải đối diện với cả một file slide dài.
>
> Công việc thật sự của bạn ấy không phải “xem video AI”, mà là **nắm lại mạch kiến thức và biết phần nào cần quay về tài liệu gốc**.
>
> Pain này xuất hiện rõ trong dữ liệu VLearn. Trong 1.261 lượt hội thoại, 141 lượt yêu cầu tóm tắt hoặc tổng hợp; 49 lượt trong số đó bị từ chối rõ và 582 lượt trả lời không có citation.
>
> Vì vậy, chúng tôi chọn bài toán bắt lại mạch bài nhanh nhưng vẫn kiểm chứng được nguồn.

**Chuyển:** “Nhưng video không phải ý tưởng duy nhất mà nhóm cân nhắc.”

---

## Slide 2 — Vì sao chọn tính năng này · 0:45–1:30

> Chúng tôi cân nhắc bốn hướng.
>
> Context Rescue có tín hiệu lớn — 1.252 trên 1.261 lượt có selected context — nhưng chủ yếu là tối ưu Tutor hiện tại.
>
> Catch-up Map dạng text bám evidence nhất, scan nhanh và build rẻ, nên được giữ làm dự phòng.
>
> Video ôn tập được chọn **có điều kiện**, vì nó giải quyết thêm pain “không nối lại được lời giảng” và tạo flow rõ từ PDF, sang outline, sang nội dung có nguồn.
>
> Teach-back bị loại vì chưa có bằng chứng pain trực tiếp. Nếu validation cho thấy user cần scan hơn xem video, chúng tôi sẽ quay về Catch-up Map.

**Chuyển:** “Đây là cách lát cắt đã chọn hoạt động trong prototype.”

---

## Slide 3 — Giải pháp và demo live · 1:30–3:30

### Mở giải pháp · khoảng 20 giây

> Người học đưa vào một PDF. Hệ thống chọn ý quan trọng có căn cứ, tạo outline để duyệt, rồi mới dựng video có chapter và liên kết trang nguồn.
>
> Đây là **conditional automation**: duyệt outline rẻ hơn sửa một hiểu nhầm do video nói trôi chảy nhưng sai.

### Case 1 — Luồng chuẩn · khoảng 55 giây

`[Nhấn D hoặc bấm “Mở live prototype”.]`

> Đây là case chuẩn với PDF 45 trang.

`[Chọn PDF hoặc mở document đã phân tích.]`

> Người học chọn thời lượng. Pipeline phân tích nhưng chưa dựng video; nó dừng ở checkpoint outline.

`[Mở outline; chỉ vào coverage, chapter và source.]`

> Tại đây có chapter, coverage và trang nguồn. Người học có thể sửa mục tiêu, thứ tự hoặc mức chi tiết.

`[Sửa nhanh một title/detail level rồi bấm duyệt.]`

> Chỉ sau khi duyệt, hệ thống mới tạo script, giọng đọc, subtitle và video.

`[Mở kết quả; nhảy chapter và bấm mở trang nguồn.]`

> Kết quả cho phép nhảy chapter và mở đúng slide gốc. Run một đến ba phút tạo MP4 dài 75,82 giây, đúng duration contract.

### Case 2 — Chỗ khó · khoảng 35 giây

`[Chuyển sang case claim thiếu source hoặc màn hình/report tương ứng.]`

> Đây là case khó: lời thoại nghe hợp lý nhưng một claim không có source ID.
>
> Validator chặn chapter, báo “ý này chưa có nguồn”, rồi repair hoặc bỏ ý. Job không được đánh dấu hoàn tất giả khi lỗi grounding vẫn còn.

### Kết demo · khoảng 10 giây

`[Quay lại deck, slide 4.]`

> Prototype chạy được, nhưng chưa có nghĩa đã đạt quality bar.

---

## Slide 4 — Kết quả đo · 3:30–4:15

> Quality bar được chốt trước khi chạy là ít nhất 90%, mọi case P0 phải được chạy và output hoàn tất không được có claim thiếu nguồn.
>
> Baseline đạt 17 trên 20 case, tương đương 85%. Kết luận là **chưa đạt**, thiếu 5 điểm phần trăm; chúng tôi không hạ bar sau khi thấy kết quả.
>
> Failure lớn nhất là G15: estimator dự đoán 1.634 giây, WAV thật dài 902,56 giây — lệch 44,8%.
>
> Timeline đã dùng audio thật, nhưng estimator vẫn cần sửa. Hai case encrypted PDF và prompt injection chưa chạy được giữ nguyên là NOT RUN, không đổi thành PASS bằng review code.

**Chuyển:** “Ngoài kết quả kỹ thuật, dữ liệu hành vi của người học cũng làm chúng tôi thay đổi flow.”

---

## Slide 5 — User thật nói gì · 4:15–5:00

> Đây là hai câu nguyên văn trong chatlog VLearn: “Tổng hợp thông tin của toàn bộ bài giảng hôm nay” và “Tóm tắt tất cả nội dung cần note lại đầy đủ”. Cả hai lượt đều không nhận được kết quả mong muốn và đều downvote.
>
> Từ đó, chúng tôi đổi ba điểm: từ hỏi từng đoạn sang xử lý một PDF; từ bản tóm tắt một cục sang outline có thể duyệt; và mỗi chapter phải quay về được trang nguồn.
>
> Chúng tôi cũng nói rõ giới hạn: đây là hành vi thật nhưng ẩn danh. Validation CP5 có tên thật chưa được log, nên các persona rehearsal không được tính là bằng chứng.

**Chuyển:** “Khoảng trống đó cũng quyết định ba ưu tiên tiếp theo.”

---

## Slide 6 — Nếu có thêm một tuần · 5:00–5:30

> Nếu có thêm một tuần, chúng tôi chỉ làm ba việc.
>
> Một: sửa estimator đang lệch 44,8% và chạy lại đủ 20 case.
>
> Hai: chạy thật encrypted PDF và prompt injection.
>
> Ba: test với ít nhất năm người thật, quan sát họ xem, nhảy chapter hay mở nguồn; đồng thời so video với Catch-up Map.
>
> Bài học lớn nhất: **một failure được xử lý đúng tạo niềm tin hơn ba happy path đẹp.**

---

## Câu kết dự phòng

> VLearn Video Catch-up không cố thay thế bài giảng gốc. Nó giúp người học bắt lại mạch bài nhanh, biết giới hạn của hệ thống và luôn có đường quay về nguồn để tự kiểm chứng.

## Nếu live demo gặp sự cố

> Live pipeline đã được kiểm chứng bằng run PDF 45 trang và duration contract 75,82 giây. Trong thời gian còn lại, tôi sẽ dùng chính hai trạng thái trên slide để trình bày quyết định trung tâm: outline phải được duyệt trước khi render, và claim thiếu nguồn phải bị chặn trước khi video được đánh dấu hoàn tất.
