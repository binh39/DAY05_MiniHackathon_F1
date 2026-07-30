# Phân tích pain point và các hướng sản phẩm cho AI Thực Chiến

## 1. Kết luận điều hành

Sau khi rà soát đề bài, guide, rubric, AI-spec template, worksheet JTBD, 6 transcript bài giảng và toàn bộ chatlog VLearn, tôi khuyến nghị ưu tiên theo thứ tự:

1. **VLearn – “Context Rescue”: giải thích đúng đoạn người học vừa chọn, có căn cứ và tự cứu khi retrieval thất bại.**
2. **VLearn – “Catch-up có cấu trúc”: biến cả buổi học thành bản đồ ôn tập có trích dẫn, thay vì bắt người học hỏi từng slide.**
3. **Discord – “Official Answer + Safe Handoff”: chỉ trả lời logistics từ nguồn chính thức; không đủ căn cứ thì chuyển TA cùng ngữ cảnh.**
4. **VLearn – “Teach-back 60 giây”: sau khi giải thích, kiểm tra xem người học hiểu thật hay chỉ đọc xong.**
5. **Discord – “TA Unresolved Radar”: gom câu hỏi đang bị trôi, lặp lại hoặc chưa được giải quyết thành một hàng đợi hành động cho TA.**

Nếu chỉ chọn **một** đề tài để thi, lựa chọn chắc nhất là **Context Rescue**. Đây là đề tài duy nhất hiện có chuỗi bằng chứng tương đối đầy đủ:

- Người dùng thực sự làm hành vi đó ở quy mô lớn.
- Hệ thống hiện tại thất bại với tần suất đáng kể.
- Failure liên hệ rõ với downvote.
- Sau failure, người dùng phải hỏi lại.
- Lát cắt đủ hẹp để prototype trong hackathon.
- Có thể xây golden set trực tiếp từ log thật.

Một câu lát cắt đề xuất:

> **Khi một học viên đang trong buổi học chọn một đoạn slide để làm rõ, hệ thống quyết định liệu đã có đủ căn cứ để giải thích hay cần hỏi lại đúng một thông tin, để học viên nhận được lời giải thích đúng đoạn, có trích dẫn, mà không phải thử lại nhiều lần.**

Điểm cần tránh là xây “chatbot học tập tốt hơn” hoặc gộp cùng lúc tóm tắt, quiz, bản đồ lỗ hổng, Discord và tutor. Rubric thưởng cho một quyết định product có bằng chứng và được làm đến nơi đến chốn, không thưởng cho số lượng tính năng.

---

## 2. Tôi đã đọc và dùng dữ liệu nào

### Tài liệu định hướng và tiêu chí

- `README.md`, `01-de-bai.md`, `02-guide.md`, `03-template-ai-spec.md`, `04-rubric.md`.
- Worksheet JTBD và playbook tham khảo trong `tham-khao/`.
- Trọng tâm áp dụng: job executor cụ thể, job không chứa tên giải pháp, impact có số, lát cắt một câu, cost-of-error, bốn lớp chỗ khó, golden set và validation với người thật.

### Dữ liệu hành vi

- **2.522 message**, tương ứng **1.261 lượt hỏi–đáp**.
- **369 học viên ẩn danh**, **585 hội thoại**.
- Khoảng thời gian 22–29/07/2026.
- 100% log ở chế độ `in_class`.
- **1.252/1.261 lượt (99,3%)** bắt đầu từ việc người học chọn một đoạn/trang trong tài liệu.

### Dữ liệu nội dung

- 6 transcript, khoảng 700 đoạn có mã trích dẫn.
- Transcript cho thấy khóa học có nhiều khái niệm nối tiếp nhau, hoạt động lớp, yêu cầu bài tập, kênh Discord, LMS, email và các hướng dẫn vận hành. Đây là nguồn tốt để xây prototype hoặc golden set, nhưng không nên xem lời giảng viên là bằng chứng thay cho pain của người học.

### Giới hạn của phân tích

- Log chỉ phủ một tuần và chỉ phủ VLearn trong lớp; không đại diện đầy đủ cho hành vi trước buổi, sau buổi hay lúc ôn thi.
- Chỉ có 70 rating trên 1.261 lượt, tương đương khoảng **5,6%**. Rating rất hữu ích để đọc failure, nhưng không đủ để suy rộng tuyệt đối.
- “Không có citation” không tự động đồng nghĩa “câu trả lời sai”. Tuy nhiên, việc no-citation tập trung nhiều hơn trong downvote là một tín hiệu đáng chú ý.
- Repo không có Discord log. Mọi đề xuất cho hướng B hiện là **giả thuyết có căn cứ bối cảnh**, chưa đạt Evidence Gate; nhóm phải mining trực tiếp Discord.
- Các số phân loại intent/refusal dưới đây dùng quy tắc từ khóa có thể kiểm lại, nên phù hợp để sàng lọc vấn đề chứ chưa phải nhãn semantic hoàn hảo.

---

## 3. Bức tranh hành vi nổi bật từ VLearn

| Tín hiệu | Số lượng | Tỷ lệ | Điều nó gợi ý |
|---|---:|---:|---|
| Chọn đoạn/trang trước khi hỏi | 1.252/1.261 | 99,3% | Ngữ cảnh người dùng đã rất cụ thể; kỳ vọng “đúng đoạn này” là hợp lý |
| Câu trả lời không có citation | 582/1.261 | 46,2% | Grounding/cách hiển thị căn cứ chưa ổn định |
| Câu trả lời dạng “không tìm thấy/không có dữ liệu” | 179/1.261 | 14,2% | Retrieval/context fail là pain có quy mô |
| Intent giải thích/làm rõ | khoảng 573/1.261 | 45,4% | Core job lớn nhất là hiểu một khái niệm/đoạn học |
| Intent tóm tắt/tổng hợp | khoảng 143/1.261 | 11,3% | Nhu cầu catch-up/overview là một cụm rõ |
| Intent tóm tắt bị từ chối | 48/143 | 33,6% | Tutor hiện tại đặc biệt yếu với yêu cầu tổng hợp rộng |
| Downvote có refusal | 12/37 | 32,4% | Refusal là một nguyên nhân trực tiếp của bất mãn |
| Upvote có refusal | 0/33 | 0% | Không thấy refusal nào được upvote trong mẫu rating |
| Downvote không citation | 29/37 | 78,4% | Thiếu căn cứ có quan hệ mạnh với trải nghiệm xấu |
| Upvote không citation | 12/33 | 36,4% | No-citation không luôn sai, nhưng chênh lệch rất đáng kể |
| Hỏi tiếp trong 10 phút sau refusal | 75 lượt, 51 hội thoại | — | Failure tạo thêm công và làm đứt mạch học |
| Tutor chủ động hỏi kiểm tra hiểu | 3/1.261 | 0,24% | Tutor đang chủ yếu “nói”, gần như chưa “dạy” theo vòng phản hồi |
| `misconceptions` được ghi nhận | 0 | 0% | Năng lực phát hiện hiểu sai chưa được vận hành |
| `follow_ups` được tạo | 0 | 0% | Chưa có đường dẫn học tiếp theo |
| Move `validate_understanding` | 1/1.261 | 0,08% | Kiểm tra hiểu thật gần như vắng mặt |
| Độ trễ >5 giây | 49/1.261 | 3,9% | Có pain hiệu năng, nhưng nhỏ hơn pain chất lượng |
| Độ trễ p90 / max | 3.686 ms / 23.848 ms | — | Có outlier, nhưng chưa phải ứng viên product tốt nhất |

### Những failure định tính đáng chú ý

- `T0135`: người học chọn trang 16 và xin tóm tắt các giai đoạn/biểu đồ; tutor nói không tìm thấy.
- `T0157`: người học chọn trang 12 và yêu cầu giải thích; tutor nói không truy cập được trang 12.
- `T0214`: chọn trang 32; tutor nói tài liệu không gồm trang 32.
- `T0404`, `T0408`, `T0443`, `T0776`, `T0938`, `T1096`: người học xin tổng hợp buổi/slide; tutor trả về một lời từ chối chung chung.
- `T0397`: người học chọn “Tool” ở trang 3 nhưng câu trả lời cite trang 47; bị downvote.
- `T1084`: người học hỏi slide 4 nhưng câu trả lời gọi “slide 4 [trang 70]”; bị downvote.
- `T1103`: người học hỏi về chính phạm vi tool của tutor nhưng tutor chuyển sang giải thích Agent nói chung; bị downvote. Đây là lỗi **không nhận đúng intent**, không chỉ là retrieval.

Điểm quan trọng: user đã cung cấp ngữ cảnh bằng thao tác chọn đoạn. Khi tutor vẫn nói “hãy cung cấp thêm nội dung”, sản phẩm đang đẩy việc sửa lỗi ngược lại cho user. Đây là khoảnh khắc gây khó chịu mạnh vì người dùng có lý do chính đáng để nghĩ rằng họ **đã cung cấp nội dung rồi**.

---

## 4. Hướng A – VLearn

## A1. Context Rescue – giải thích đúng đoạn được chọn

### Pain cụ thể

**Học viên đang trong buổi học muốn làm rõ ngay đoạn vừa đọc, đã chọn đúng đoạn/trang, nhưng tutor không lấy được đúng ngữ cảnh hoặc trả về trang khác; học viên mất mạch nghe giảng, mất niềm tin và phải hỏi lại.**

### Vì sao đây là pain mạnh nhất

- Tập user lớn: 369 người trong một tuần log.
- Hành vi cốt lõi: 99,3% lượt có selected context.
- Failure nhìn thấy được: 14,2% refusal/not-found.
- Tác động hành vi: có 75 lượt hỏi tiếp trong 10 phút sau refusal, thuộc 51 hội thoại.
- Tác động cảm xúc: 32,4% downvote là refusal; không có refusal nào trong 33 upvote.
- Tác động niềm tin: 78,4% downvote không có citation.

### Tính năng nên build

Một **decision layer** đứng trước câu trả lời:

1. Đọc chính selected text và page hiện tại trước.
2. Kiểm tra retrieval có khớp đoạn đang chọn không.
3. Nếu khớp: giải thích theo đúng đoạn, cite cạnh từng ý.
4. Nếu có tài liệu liên quan nhưng số trang lệch: nói rõ “đoạn bạn chọn ở trang X; phần liên quan nằm ở trang Y”.
5. Nếu context quá ngắn như “e”, “r”, “là gì”: hỏi **một** câu làm rõ có lựa chọn cụ thể.
6. Nếu thực sự không có căn cứ: nói phần nào thiếu, gợi ý thao tác nhỏ nhất để tiếp tục; không dùng lời xin lỗi template dài.

### Khoảnh khắc “rất hài lòng”

Người học bôi đen một câu khó, nhận được:

- một câu diễn giải dễ hiểu;
- một ví dụ sát nội dung;
- “ý cần nhớ” trong một dòng;
- citation đúng trang;
- nút “Tôi vẫn chưa hiểu” để đổi cách giải thích.

Niềm vui không đến từ câu trả lời dài hơn, mà từ cảm giác: **“Nó biết chính xác mình đang nhìn vào đâu.”**

### MVP trong hackathon

- Input: selected text, page, câu hỏi.
- Output: `answer`, `evidence`, `confidence`, `next_action`.
- Ba nhánh demo: đủ căn cứ; mơ hồ; retrieval fail.
- Không cần sửa toàn bộ RAG production. Có thể prototype bằng transcript/slide context nhỏ và một lớp đánh giá khớp ngữ cảnh.

### Metric phù hợp

- `Grounded answer rate`: tỷ lệ câu trả lời có bằng chứng đúng với selected passage.
- `Wrong-page citation rate`.
- `Useful recovery rate`: case thiếu căn cứ nhưng hỏi lại đúng thông tin cần thiết.
- `First-turn resolution`: user không phải diễn đạt lại trong 10 phút.
- User test: “Câu trả lời có đúng đoạn bạn đang hỏi không?” và “Bạn có biết nên làm gì tiếp không?”

### Quality bar gợi ý

- ≥90% case thường trả lời đúng đoạn.
- 100% case thiếu căn cứ không bịa.
- ≥80% case mơ hồ hỏi lại một câu hữu ích.
- 0 case cite một trang nhưng diễn giải nội dung từ trang khác.

### Bốn lớp chỗ khó

1. **Nguồn sự thật:** selected text mâu thuẫn với retrieval; page index của PDF và slide lệch nhau.
2. **Mơ hồ:** đoạn chọn chỉ có một chữ, sơ đồ không có text, câu “là gì”.
3. **Ngoài phạm vi:** xin tải PDF, hỏi thông tin hệ thống, hỏi nội dung ngoài khóa.
4. **Đặc thù domain:** giải thích sai khái niệm kỹ thuật làm người học học sai; citation đúng số trang nhưng sai tài liệu vẫn nguy hiểm.

---

## A2. Catch-up có cấu trúc – từ “tóm tắt cả buổi” thành đường ôn tập

### Pain cụ thể

**Học viên muốn nắm lại nội dung chính của một buổi dài, nhưng tutor chỉ xử lý tốt câu hỏi cục bộ; yêu cầu tổng hợp rộng thường bị từ chối, khiến họ phải mở từng slide hoặc tự dựng lại cấu trúc buổi học.**

### Bằng chứng

- Khoảng 143/1.261 lượt mang intent tóm tắt/tổng hợp.
- 48/143, tương đương **33,6%**, bị từ chối theo pattern “không tìm thấy/không thể tổng hợp”.
- Nhiều downvote rơi vào đúng nhu cầu này: `T0135`, `T0176`, `T0404`, `T0408`, `T0443`, `T0776`, `T0938`, `T1096`, `T1258`.
- Sáu transcript đã có cấu trúc heading và mã đoạn, phù hợp để tạo bản đồ nội dung có nguồn.

### Tính năng nên build

Không làm “summary một cục”. Tạo **Catch-up Map**:

- 5 ý lớn của buổi;
- mỗi ý: giải thích 2–3 câu, đoạn transcript/slide nguồn;
- “cần biết trước” và “dễ nhầm ở đâu”;
- 3 mức thời gian: 3 phút, 10 phút, học kỹ;
- cuối map có 3 câu self-check.

### Khoảnh khắc “rất hài lòng”

Người nghỉ một buổi không phải tua 2–3 giờ video. Trong vài phút họ biết:

- buổi này đi qua những gì;
- phần nào là nền tảng cho bài sau;
- đoạn nào cần xem lại;
- mình đã hiểu đến đâu.

### Rủi ro

- Pain “nghỉ buổi/catch-up” chưa được log trực tiếp; cần khảo sát ít nhất 20 người về **lần gần nhất** họ phải xem lại một buổi.
- Summary sai hoặc bỏ mất requirement bài tập có thể gây hậu quả. Phần deliverable/deadline phải lấy từ nguồn chính thức, không suy diễn từ transcript.

### MVP

Chỉ chọn **một buổi** và **một user**: học viên nghỉ buổi muốn bắt kịp trước buổi tiếp theo. Không làm toàn khóa.

---

## A3. Teach-back 60 giây – kiểm tra hiểu thật sau câu trả lời

### Pain cụ thể

**Học viên nhận được lời giải thích trôi chảy nhưng không biết mình đã hiểu đúng hay chỉ thấy “có vẻ hiểu”; hiểu sai được mang sang bài lab hoặc bài quiz.**

### Bằng chứng hiện có

- `asked_check_question=True` chỉ 3/1.261 lượt.
- `validate_understanding` chỉ 1 lượt.
- `misconceptions=[]` và `follow_ups=[]` trong toàn bộ log.
- Tutor đang dùng `review_concept` ở khoảng 85% lượt, cho thấy hành vi chủ đạo là phát nội dung một chiều.
- Transcript `T02-024` đến `T02-026` nhấn mạnh hiệu quả học phải đo tới quiz/khả năng làm bài, không chỉ lượt dùng.

Đây là **khoảng trống năng lực của sản phẩm**, chưa phải bằng chứng đủ rằng user cảm thấy đau. Explicit quiz/check intent trong chatlog rất ít. Cần khảo sát trước khi chọn.

### Tính năng nên build

Sau một câu giải thích:

- hỏi một câu dự đoán/áp dụng, không hỏi “bạn hiểu chưa?”;
- phân loại đáp án thành hiểu đúng, hiểu một phần, misconception;
- nếu sai, chỉ giải thích đúng lỗ hổng rồi hỏi lại một câu tương đương;
- cho phép bỏ qua ngay để không làm phiền người đang nghe giảng.

### Vì sao có thể tạo hài lòng

“Aha moment” đến khi hệ thống chỉ ra chính xác: **“Bạn hiểu đúng vai trò của tool, nhưng đang nhầm tool calling với ReAct.”** Đây là giá trị gia sư thật, khác một chatbot trả lời.

### Rủi ro

- Chủ động hỏi trong giờ có thể gây phiền.
- Nếu câu hỏi kiểm tra quá dễ, user thấy trẻ con; quá khó, user mất động lực.
- Nên là opt-in hoặc xuất hiện sau tín hiệu “giải thích lại/tôi chưa hiểu”.

---

## A4. Class Confusion Map – bản đồ lỗ hổng cho giảng viên

### Pain cụ thể

**Giảng viên/TA có hàng trăm câu hỏi nhưng không biết khái niệm nào đang khiến nhiều người kẹt, câu nào chỉ là spam và chỗ nào tutor trả lời thất bại; họ không biết nên dành 5 phút chữa lại phần nào.**

### Bằng chứng

- 1.261 lượt hỏi trong một tuần từ 369 người.
- Có nhiều prompt lặp: “giải thích đoạn bôi đen ở trang X”, “là gì”, “tóm tắt slide này”.
- 179 failure có thể nhóm theo tài liệu/trang/chủ đề.
- Misconception field hoàn toàn chưa được dùng.

### Feature đúng

Không làm dashboard đếm keyword. Làm **một quyết định**:

> “Trong 5 phút cuối buổi, giảng viên nên chữa lại khái niệm nào, vì bao nhiêu học viên hỏi, tutor fail bao nhiêu lần, và ba ví dụ đại diện là gì?”

### Vì sao chưa nên xếp số 1

- Chưa có phỏng vấn giảng viên/TA xác nhận họ thực sự ra quyết định theo cách này.
- Prompt “giải thích trang X” lặp chưa chắc đồng nghĩa cùng misconception.
- Build clustering rất dễ gây “dashboard đẹp nhưng không tạo hành động”.

---

## 5. Hướng B – Trợ lý học viên trên Discord

Repo chủ động không cung cấp Discord data. Vì vậy các mục B dưới đây là **cơ hội cần mining**, không được trình bày với giám khảo như fact đã chứng minh.

## B1. Official Answer + Safe Handoff

### Pain giả thuyết

**Học viên cần deadline, link nộp bài, lịch học hoặc quy định; thông tin nằm rải rác và có thể đã thay đổi. Nếu bot đoán sai, học viên có thể nộp muộn hoặc đi sai nơi.**

### Tín hiệu bối cảnh

- Transcript `T06-069` đến `T06-071`: có câu hỏi về syllabus trên LMS, email đăng nhập, kết nối Discord, feedback lỗi kết nối và cấu trúc channel.
- Transcript `T03-150` đến `T03-152`: học viên hỏi về checklist project và thời điểm nhận.
- `01-de-bai.md` xác định sai deadline là lỗi có hậu quả trực tiếp.
- VLearn chỉ có khoảng 6 lượt logistics; điều này không phủ định pain vì VLearn không phải nơi tự nhiên để hỏi logistics.

### Tính năng nên build

- Router nhận diện `logistics / học thuật / chào hỏi / ngoài phạm vi`.
- Với logistics: chỉ retrieve từ danh sách nguồn được duyệt.
- Mỗi câu trả lời có nguồn, thời điểm cập nhật, và phạm vi áp dụng.
- Không có nguồn hoặc hai nguồn mâu thuẫn: không đoán; tạo handoff cho TA với câu hỏi, nguồn đã kiểm tra và phần đang mâu thuẫn.
- TA trả lời một lần có thể cập nhật knowledge item sau duyệt.

### Khoảnh khắc “rất hài lòng”

Không phải bot trả lời thật nhanh, mà là:

> “Deadline là 23:59 ngày 1 theo thông báo X cập nhật lúc Y. Đây là link nộp. Nếu bạn thuộc khóa 4, lịch khác ở đây.”

User biết **vì sao nên tin**.

### Mining cần làm trong 30–45 phút

Lấy 200–300 message gần nhất ở các channel hỗ trợ:

- Đếm câu hỏi logistics.
- Đếm câu hỏi lặp về cùng một thông tin.
- Đếm câu chưa có trả lời sau 15/30/60 phút.
- Đếm câu có hai câu trả lời mâu thuẫn hoặc được sửa lại.
- Giữ ít nhất 5 quote ngắn, có mã message/thread.

Nếu không đạt tần suất, loại đề tài dù mức độ nghiêm trọng cao.

---

## B2. TA Unresolved Radar – không để câu hỏi bị trôi

### Pain giả thuyết

**TA phải nhìn nhiều channel cùng lúc; câu hỏi thật bị chôn dưới hội thoại, reaction hoặc câu hỏi mới, khiến học viên đang kẹt chờ quá lâu và bỏ cuộc.**

### Tính năng nên build

Một hàng đợi ưu tiên, không phải bản tin dài:

- câu chưa được trả lời;
- câu đã có reply nhưng người hỏi vẫn nói “chưa hiểu/không chạy”;
- nhiều người hỏi cùng một chủ đề;
- câu có deadline gần;
- đề xuất người/nguồn để xử lý;
- TA đánh dấu resolved, merge hoặc dismiss.

### Lát cắt

> **Cuối mỗi block 30 phút, một TA cần chọn câu hỏi nào phải xử lý trước; hệ thống quyết định ba thread có rủi ro bị trôi cao nhất để TA phản hồi trước khi học viên mất động lực.**

### Metric

- Recall câu thật sự unresolved.
- False alert rate.
- Median time-to-first-useful-response.
- Tỷ lệ thread được resolve sau khi vào radar.

### Rủi ro

“Không có reply” không luôn nghĩa “stuck”; người học có thể tự giải xong hoặc đang nói chuyện xã giao. Cần nút dismiss và không DM chủ động ở MVP.

---

## B3. Newcomer Navigator – biết bắt đầu từ đâu

### Pain giả thuyết

**Học viên mới hoặc vừa mất kết nối không biết LMS, email, Discord channel, tài liệu và form hỗ trợ nằm ở đâu; họ phải hỏi nhiều nơi trước khi bắt đầu học.**

### Tín hiệu

Các đoạn `T06-069`–`T06-071` cho thấy onboarding gồm nhiều bề mặt: LMS, email, QR hướng dẫn, form feedback, Discord và nhiều channel.

### Feature

Một flow chẩn đoán ngắn:

1. Bạn đang muốn vào đâu?
2. Bạn vướng ở bước nào?
3. Hệ thống đưa đúng một hướng dẫn chính thức.
4. Nếu lỗi tài khoản/kết nối, tạo ticket có đủ thông tin cho bộ phận phù hợp.

### Điều kiện chọn

Chỉ chọn nếu Discord mining thấy onboarding question lặp với số lượng đủ lớn. Nếu sự cố chỉ tập trung trong ngày đầu rồi biến mất, impact toàn khóa có thể thấp.

---

## B4. Intent Router “đúng cỡ”

### Pain giả thuyết

Bot trả một đoạn dài cho lời chào, trả kiến thức cho câu logistics, hoặc cố trả lời một input vô nghĩa. Log VLearn có các prompt lặp như “hi”, “hello”, “là gì”, ký tự rời; một số downvote cho thấy tutor hiểu sai intent hệ thống.

### Feature

Chỉ làm router + policy:

- chào hỏi → một câu ngắn + gợi ý phạm vi;
- học thuật → grounded answer;
- logistics → official source;
- mơ hồ → một câu hỏi lại;
- ngoài phạm vi → từ chối ngắn + nơi phù hợp.

Đây là feature dễ build nhưng dễ bị chấm là “phân loại intent chung chung”. Muốn mạnh, phải gắn nó với một hậu quả cụ thể, tốt nhất là **logistics sai** hoặc **handoff sai**.

---

## 6. Hướng C – Làn mở

## C1. Lecture-to-Action – từ buổi học dài thành việc cần làm tiếp theo

### Pain giả thuyết

**Sau một buổi nhiều khái niệm, ví dụ và hoạt động, học viên nhớ “đã nghe gì” nhưng không rõ tối nay phải làm gì, tài liệu nào cần xem lại và việc nào là deliverable.**

### Cơ hội

Transcript chứa cả lý thuyết, Q&A, hoạt động và yêu cầu. Một sản phẩm có thể tách:

- `Concept`: cần hiểu.
- `Decision`: giảng viên đã chốt.
- `Action`: học viên cần làm.
- `Deadline/source`: chỉ lấy từ nguồn chính thức.
- `Open question`: điều chưa rõ cần hỏi TA.

### Vì sao có thể tạo hài lòng

Nó giảm “mệt vì phải tự tái cấu trúc cả buổi”, đặc biệt sau buổi dài. Người học nhận được checklist cá nhân ngắn, không phải một bản tóm tắt 2.000 chữ.

### Evidence còn thiếu

Phải khảo sát lần gần nhất người học kết thúc buổi:

- họ ghi task ở đâu;
- từng quên/nộp thiếu gì;
- mất bao lâu để tìm lại;
- cái gì trong summary hiện tại không hữu ích.

---

## C2. Assignment Requirement Guard – kiểm tra “đủ để nộp” trước deadline

### Pain giả thuyết

**Học viên đã làm bài nhưng không chắc đã đáp ứng đủ deliverable/rubric; họ dò nhiều tài liệu hoặc hỏi lại TA, và có thể mất điểm vì thiếu một mục chứ không phải vì không biết làm.**

### Feature

- User chọn assignment và đưa cấu trúc bài nộp.
- Hệ thống đối chiếu với rubric/nguồn chính thức.
- Trả checklist `đã có / chưa thấy / cần người kiểm`.
- Mỗi yêu cầu dẫn về đúng nguồn.
- Tuyệt đối không tự chấm chất lượng nếu chưa đủ căn cứ.

### Vì sao đáng cân nhắc

Pain gắn trực tiếp với mất điểm và deadline nên willingness-to-use có thể cao. Prototype rất rõ: một assignment, một rubric, một pre-submit check.

### Rủi ro

Chưa có log chứng minh học viên thường nộp thiếu. Cần khảo sát và hỏi TA về lỗi nộp bài lặp lại. Nếu chỉ hỏi “bạn có muốn checker không?”, kết quả “có” không có giá trị.

---

## C3. Personal Learning Gap Map – bản đồ lỗ hổng của từng học viên

### Pain giả thuyết

**Người học hỏi nhiều câu rời rạc nhưng không nhìn thấy các câu đó cùng bắt nguồn từ một lỗ hổng nền tảng; họ tiếp tục chữa triệu chứng thay vì học lại prerequisite.**

### Feature

Từ lịch sử câu hỏi + teach-back:

- gom các khái niệm đã hỏi;
- chỉ kết luận “lỗ hổng” khi có bằng chứng từ câu trả lời sai, không suy từ việc đã hỏi;
- đề xuất đúng một prerequisite và một đoạn học lại;
- cho user sửa/xóa suy luận.

### Vì sao chưa nên làm trong hackathon

- Dễ overclaim từ log.
- Misconception data hiện bằng 0.
- Cần nhiều interaction theo thời gian.
- Quyền riêng tư và cảm giác bị “chấm năng lực” là rủi ro lớn.

Nên chọn **Teach-back 60 giây** làm lát cắt đầu tiên thay vì build cả bản đồ.

---

## 7. Bảng so sánh ứng viên

Thang 1–5. “Evidence” đánh giá trên dữ liệu hiện có, không tính evidence nhóm có thể thu sau.

| Ứng viên | Evidence hiện có | Mức đau/hậu quả | Khả năng làm user hài lòng | Build trong hackathon | Rủi ro sai | Khuyến nghị |
|---|---:|---:|---:|---:|---:|---|
| A1 Context Rescue | 5 | 4 | 5 | 5 | 3 | **Chọn số 1** |
| A2 Catch-up Map | 4 | 4 | 5 | 4 | 3 | **Chọn số 2** |
| A3 Teach-back 60 giây | 3 | 5 | 4 | 4 | 3 | Chọn nếu survey xác nhận |
| A4 Class Confusion Map | 3 | 4 | 4 | 3 | 4 | Cần phỏng vấn TA/GV |
| B1 Official Answer + Handoff | 2 | 5 | 5 | 4 | 4 | **Ứng viên B mạnh nhất sau mining** |
| B2 TA Unresolved Radar | 1 | 4 | 4 | 4 | 3 | Cần Discord log |
| B3 Newcomer Navigator | 2 | 3 | 4 | 5 | 2 | Quick win nếu tần suất đủ |
| B4 Intent Router | 2 | 3 | 3 | 5 | 2 | Không nên đứng một mình |
| C1 Lecture-to-Action | 2 | 4 | 5 | 4 | 3 | Ứng viên C dễ “wow” nhất |
| C2 Requirement Guard | 1 | 5 | 5 | 4 | 4 | Chọn nếu có lỗi nộp bài thật |
| C3 Personal Gap Map | 2 | 4 | 4 | 2 | 5 | Quá rộng cho hackathon |

---

## 8. Ba concept nên mang đi khảo sát ngay

Để tránh hỏi dẫn dắt, không đưa feature trước. Hỏi về hành vi gần nhất.

### Concept 1 – Context Rescue

Hỏi 20 người:

1. Lần gần nhất bạn bôi đen một đoạn và hỏi tutor là khi nào?
2. Bạn muốn làm rõ điều gì?
3. Câu trả lời có đúng đoạn không? Bạn kiểm bằng cách nào?
4. Nếu không hữu ích, bạn làm gì tiếp: hỏi lại, ChatGPT, hỏi bạn, bỏ qua?
5. Việc đó làm bạn mất bao nhiêu phút và có khiến lỡ phần giảng tiếp theo không?

Điều cần xác nhận: ít nhất 50% từng gặp câu trả lời sai ngữ cảnh/không tìm thấy và phải dùng một workaround.

### Concept 2 – Catch-up Map

1. Lần gần nhất bạn nghỉ hoặc không theo kịp một buổi, bạn bắt kịp bằng cách nào?
2. Bạn mở slide, video, transcript hay hỏi bạn?
3. Mất bao lâu để biết phần nào quan trọng?
4. Bạn từng bỏ sót prerequisite hoặc deliverable nào không?
5. Một bản tóm tắt hiện tại fail ở đâu?

Điều cần xác nhận: pain không chỉ là “muốn tiện hơn”, mà có chi phí thời gian/học hụt cụ thể.

### Concept 3 – Official Answer

Mining Discord trước rồi phỏng vấn:

1. Lần gần nhất bạn cần deadline/link/quy định, bạn tìm ở đâu?
2. Có bao nhiêu nguồn bạn phải kiểm?
3. Bạn từng nhận hai câu trả lời khác nhau chưa?
4. Nếu bot không chắc, bạn muốn nó làm gì?
5. Với thông tin nào bạn bắt buộc phải thấy nguồn?

Điều cần xác nhận: có volume đủ và hậu quả thực, không chỉ vài câu hỏi onboarding.

---

## 9. Đề xuất cuối cùng nếu phải quyết định hôm nay

### Chọn: A1 – Context Rescue

**Problem statement không có chữ AI:**

> Học viên đang trong buổi học muốn làm rõ ngay đoạn tài liệu vừa chọn, nhưng câu trả lời thường không lấy được đúng nội dung hoặc dẫn sang trang khác, khiến họ mất mạch học và phải diễn đạt lại.

**Job statement:**

> Làm rõ đúng chỗ vừa đọc chưa hiểu mà không phải rời trang hoặc lặp lại ngữ cảnh.

**Job story:**

> Khi tôi đang nghe giảng và gặp một đoạn khó, tôi muốn nhận một lời giải thích bám đúng đoạn đó ngay lần đầu, để tôi tiếp tục theo bài mà không bị rơi khỏi nhịp lớp.

**Lát cắt prototype:**

> Một học viên đang trong buổi chọn một đoạn khó; hệ thống quyết định context có đủ và khớp hay không; sau đó trả lời có căn cứ hoặc hỏi lại đúng một câu; để học viên tiếp tục theo bài ngay lần đầu.

**Automation: Conditional.**

- Tự trả lời khi selected passage và nguồn khớp.
- Hỏi lại khi input mơ hồ.
- Từ chối có hướng dẫn khi không có căn cứ.
- Lý do: sai kiến thức/cite sai làm mất niềm tin và có thể khiến học sai; chi phí hỏi lại một câu thấp hơn chi phí trả lời liều.

**Non-goals:**

- Không tóm tắt toàn bộ khóa.
- Không tạo quiz/bản đồ lỗ hổng.
- Không trả lời logistics.
- Không tìm tài liệu ngoài.
- Không thay đổi toàn bộ hạ tầng RAG production.

**“Wow” cần demo:**

1. Case hiện tại fail: chọn slide 12, tutor nói không tìm thấy.
2. Prototype: dùng chính selected text, giải thích đúng, cite đúng.
3. Case mơ hồ: chỉ chọn “Tool”; hệ thống hỏi “Bạn muốn hiểu định nghĩa, cách dùng hay sự khác nhau với Agent?”.
4. Case không có căn cứ: nói rõ thiếu gì và không bịa.
5. Cho thấy kết quả golden set trước/sau bằng tỷ lệ, không chỉ live demo đẹp.

### Khi nào nên đổi sang đề tài khác

- Đổi sang **A2 Catch-up Map** nếu khảo sát cho thấy retrieval fail ít gây khó chịu, nhưng phần lớn học viên mất nhiều thời gian bắt kịp sau buổi.
- Đổi sang **B1 Official Answer + Handoff** nếu Discord mining tìm được volume logistics cao, câu hỏi lặp và ít nhất vài case thông tin sai/mâu thuẫn có hậu quả.
- Đổi sang **C2 Requirement Guard** nếu TA xác nhận lỗi thiếu deliverable/rubric xảy ra thường xuyên và làm học viên mất điểm.

Không nên đổi chỉ vì một concept “nghe dùng AI nhiều hơn”. Hướng tốt nhất là hướng có chuỗi rõ nhất:

> **pain quan sát được → hậu quả có số → một quyết định AI → hành vi an toàn khi không chắc → metric chứng minh user làm job tốt hơn.**
