# Brainstorm — Giai đoạn 1: Khám phá

**Hướng:** A — Tính năng AI mới trên VLearn**Ý tưởng đang kiểm chứng:** biến PDF slide dài thành video tóm tắt dưới 10 phút, có slide minh họa, lời thoại tiếng Việt và đường dẫn về trang nguồn.

> **Nguyên tắc trung thực:** dữ liệu hiện có chứng minh nhu cầu **tóm tắt/tổng hợp để ôn lại bài học**, chưa chứng minh người học ưu tiên **video** hơn các định dạng khác. Vì vậy, video là giả thuyết giải pháp cần kiểm chứng trong khảo sát/validation, không phải một kết luận đã có bằng chứng.

---

## 1. Trả lời 5 câu hỏi khám phá

### 1.1 Ai là người trực tiếp làm việc này?

**Job executor:** Học viên đã học xong một buổi, và muốn ôn lại nội dung chính của buổi học.

Đây không phải “học viên nói chung”. Người dùng được chọn có:

- trigger rõ: cần ôn lại một buổi đã học;
- tài liệu đầu vào rõ: PDF slide của đúng buổi học;
- hậu quả rõ: phải đọc lại quá nhiều slide, khó nhớ mạch kiến thức hoặc bỏ sót ý nền tảng cần dùng tiếp.

### 1.2 Họ đang cố hoàn thành việc gì?

**Core JTBD — không chứa tên sản phẩm/AI:**

> Ôn lại mạch kiến thức chính của một buổi đã học và xác định phần nào cần xem kỹ trong tài liệu gốc trước khi làm bài, làm quiz hoặc học tiếp.

Tự kiểm: nếu bỏ AI, video và VLearn khỏi câu trên thì công việc vẫn tồn tại. Vì vậy đây là job của người học, không phải mô tả tính năng.

**Problem statement — không có chữ AI:**

> Học viên muốn ôn lại một buổi học nhưng phải tự đọc và ghép mạch từ hàng chục slide hoặc hỏi tutor từng đoạn; yêu cầu tổng hợp rộng đôi khi không được đáp ứng, khiến họ tốn thời gian và dễ bỏ sót ý chính cần dùng khi làm bài, làm quiz hoặc học tiếp.

### 1.3 Hôm nay họ giải quyết bằng gì, fail ở đâu, vì sao chưa bỏ?

| Cách làm hiện tại                         | Làm tốt gì?                                     | Fail ở đâu?                                                                                   | Vì sao chưa bỏ?                                        |
| ----------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Đọc lần lượt toàn bộ PDF                  | Nguồn gốc đầy đủ, xem được biểu đồ và công thức | Tốn công tự xác định ý chính và nối mạch giữa nhiều slide                                     | Chính xác nhất và luôn có sẵn                          |
| Tua lại video/bản ghi buổi học nếu có     | Có lời giảng và ngữ cảnh đầy đủ                 | Khó tìm đúng đoạn; thời lượng dài; có thể không có bản ghi                                    | Giữ được cách giải thích của giảng viên                |
| Hỏi AI tutor trên VLearn từng đoạn        | Nhanh và ngay trong trang học                   | Xử lý tốt câu hỏi cục bộ hơn yêu cầu tổng hợp toàn buổi; có case từ chối hoặc thiếu trích dẫn | Tiện, không cần rời VLearn                             |
| Đưa PDF vào chatbot/công cụ tóm tắt riêng | Có thể cho overview nhanh                       | Chất lượng không ổn định, khó kiểm ý nào đến từ trang nào, có rủi ro dữ liệu                  | Quen thuộc và thao tác nhanh                           |
| Hỏi bạn/TA                                | Có thể biết phần giảng viên nhấn mạnh           | Phụ thuộc thời gian người khác; câu trả lời không đồng nhất                                   | Tin con người và có thể hỏi tiếp                       |
| Bỏ qua hoặc chỉ đọc vài slide             | Tiết kiệm thời gian ngay lập tức                | Dễ mất prerequisite, chỉ phát hiện khi học bài sau hoặc làm quiz                              | Khi thiếu thời gian, đây là lựa chọn rẻ nhất trước mắt |

Nếu sản phẩm không ra đời, người dùng nhiều khả năng tiếp tục đọc lướt PDF, hỏi từng đoạn hoặc dùng một công cụ tóm tắt riêng. Sản phẩm mới phải tốt hơn ở **tốc độ bắt mạch** và **khả năng kiểm lại nguồn**, không chỉ tạo ra một nội dung trông hấp dẫn.

### 1.4 Bằng chứng nào cho thấy pain có thật?

Nguồn và phương pháp đầy đủ nằm trong [`evidence/mining-log.md`](evidence/mining-log.md). Mining sử dụng chatlog VLearn đã ẩn danh, không sao chép dữ liệu gốc ra ngoài repo.

| Tín hiệu kiểm đếm được                      |                          Kết quả | Diễn giải đúng mức                                                           |
| ------------------------------------------- | -------------------------------: | ---------------------------------------------------------------------------- |
| Tổng số lượt học viên–tutor được xét        | 1.261 lượt, 369 học viên ẩn danh | Mẫu hành vi trên VLearn trong khoảng dữ liệu được cấp                        |
| Lượt có ngữ cảnh trang/đoạn được chọn       |              1.252/1.261 (99,3%) | Người học thường hỏi từ một vị trí cụ thể trong tài liệu                     |
| Lượt có từ khóa`tóm tắt` hoặc `tổng hợp`    |                141/1.261 (11,2%) | Nhu cầu tổng hợp lặp lại đủ để tiếp tục điều tra                             |
| Lượt tổng hợp nhận refusal rõ theo rule hẹp |                   49/141 (34,8%) | Tutor hiện tại không đáp ứng trực tiếp một phần đáng kể nhu cầu tổng hợp     |
| Lượt tutor không có citation                |                582/1.261 (46,2%) | Cần thiết kế cho phép kiểm nguồn; không có nghĩa mọi câu trả lời này đều sai |

Năm ví dụ hành vi nguyên văn tối thiểu:

| Turn    | Câu của học viên                                       | Kết quả quan sát                                    |
| ------- | ------------------------------------------------------ | --------------------------------------------------- |
| `T0135` | “tóm tắt nội dung các giai đoạn được mô tả trên slide” | Không tìm được nội dung giai đoạn/biểu đồ; downvote |
| `T0404` | “Tổng họp thông tin của toàn bộ bài giảng hôm nay”     | Không thể truy xuất nội dung tổng hợp; downvote     |
| `T0443` | “tóm tắt toàn bộ slide”                                | Không trả về tóm tắt tổng quát; downvote            |
| `T0776` | “giải thích và tóm tắt nội dung học hôm này”           | Không tìm thấy phần tóm tắt tổng quát; downvote     |
| `T0938` | “tóm tắt tất cả nội dung cần note lại đầy đủ”          | Không truy cập nội dung slide để tóm tắt; downvote  |

**Bằng chứng này chứng minh được:** có nhu cầu tóm tắt/tổng hợp để xem lại bài và tutor hiện tại có lúc fail job đó.

**Bằng chứng này chưa chứng minh được:** slide của mọi buổi đều có 60–80 trang; người học mất chính xác bao nhiêu phút; video là định dạng họ thích nhất; video dưới 10 phút giúp họ hiểu hoặc nhớ tốt hơn. Các điểm này phải được khảo sát/test, không tự gán số.

### 1.5 Có ít nhất 3 hướng nào và vì sao chọn hướng này?

Các số về quy mô dưới đây chỉ dùng tín hiệu có thể kiểm lại từ mining. Phần tần suất và chi phí chưa có số được ghi rõ là giả thuyết cần khảo sát.

| Ứng viên                                                   |                                                                      Bao nhiêu người/lượt gặp | Tần suất                                      | Mỗi lần tốn gì?                                                      | Build trong 1 ngày?                                                                       | Quyết định                                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------: | --------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A1 — Giải thích đúng đoạn đang chọn (Context Rescue)       | 1.252/1.261 lượt có selected context; mining mở rộng từng ghi nhận nhóm lỗi retrieval/context | Trong-buổi; cao                               | Phải hỏi lại, mất nhịp và giảm niềm tin                              | Cao                                                                                       | **Loại khỏi lát cắt này:** pain mạnh nhưng là tối ưu tutor hiện có, không phải mục tiêu tính năng mới nhóm đã chọn |
| A2 — Bản đồ ôn tập dạng văn bản, có nguồn                  |                                                      141 lượt có nhu cầu tổng hợp; 49 refusal | Sau buổi học; cần khảo sát tần suất mỗi người | Tự ghép mạch từ slide, có thể bỏ sót prerequisite                    | Rất cao                                                                                   | **Phương án dự phòng:** sát evidence nhất và rẻ để build/test                                                      |
| A3 — Video ôn tập dưới 10 phút, có slide minh họa và nguồn |                              Cùng cụm 141 lượt; chưa có bằng chứng riêng cho preference video | Sau buổi học; cần khảo sát                    | Giả thuyết: thời gian đọc lại và tải nhận thức; chưa có số phút thật | Trung bình nếu giới hạn một PDF và mock phần dựng media; thấp nếu hứa pipeline hoàn chỉnh | **Chọn có điều kiện:** trải nghiệm dễ demo, nhưng chỉ tiếp tục nếu khảo sát xác nhận nhu cầu video                 |
| A4 — Teach-back/self-check sau phần tóm tắt                |                                          Chưa có bằng chứng pain trực tiếp trong log hiện tại | Sau khi ôn; chưa rõ                           | Có thể mang hiểu sai sang quiz/lab                                   | Cao                                                                                       | **Loại:** là bước tiếp theo, không trực tiếp giảm công sức ôn lại ban đầu                                          |

**Lý do chọn A3 có điều kiện:**

1. Cùng bám một pain có bằng chứng: 141 lượt yêu cầu tổng hợp và 49 refusal.
2. Tạo một kết quả dễ hiểu trong demo 5 phút: PDF → outline → đoạn video có narration → bấm về trang nguồn.
3. Có thể cắt scope về đúng một PDF, một chế độ thời lượng, một ngôn ngữ và một template video.
4. Khác một “summary một cục” nhờ chapter, narration, slide minh họa và trace về trang gốc.
5. Rủi ro lớn nhất là **solution preference**: user có thể chỉ cần Catch-up Map dạng text. Nếu khảo sát không xác nhận video, nhóm nên chuyển sang A2 mà vẫn giữ nguyên phần phân tích/grounding cốt lõi.

---

## 2. JTBD nhanh

### 2.1 Ba job stories

1. **Khi** tôi bắt đầu ôn lại một buổi đã học, **tôi muốn** nhanh chóng nhớ lại các ý chính và quan hệ giữa chúng, **để** không phải đọc tuần tự toàn bộ slide.
2. **Khi** tôi chuẩn bị làm quiz hoặc bài tập, **tôi muốn** nhận ra phần kiến thức nào liên quan và phần nào mình cần đọc kỹ, **để** tập trung thời gian ôn đúng chỗ.
3. **Khi** nội dung tóm tắt có vẻ khác điều tôi nhớ, **tôi muốn** quay về đúng trang nguồn, **để** tự kiểm tra trước khi áp dụng kiến thức đó.

### 2.2 Job map 8 bước

| Bước     | Người học đang làm gì?                         | Điểm vướng/cơ hội                                                    |
| -------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Define   | Xác định buổi nào cần ôn và mục tiêu ôn là gì  | Có thể không biết phần nào quan trọng cho quiz, bài tập hoặc bài sau |
| Locate   | Tìm PDF, video, transcript hoặc ghi chú        | Tài liệu nằm rải rác; video có thể không có                          |
| Prepare  | Mở tài liệu và ước lượng phạm vi cần học       | Hàng chục slide làm chi phí bắt đầu cao                              |
| Confirm  | Kiểm tra đúng phiên bản/đúng buổi              | Nhầm file hoặc thiếu trang có thể làm summary sai                    |
| Execute  | Đọc, tua, ghi chú và nối các ý                 | Tốn công tự phân biệt ý chính, ví dụ và chi tiết                     |
| Monitor  | Tự hỏi mình đã nắm đủ chưa                     | Cảm giác “đã xem” không đồng nghĩa đã hiểu                           |
| Modify   | Quay lại phần khó, hỏi thêm hoặc đổi cách học  | Khó tìm lại đúng trang/đoạn nếu summary không có nguồn               |
| Conclude | Quyết định đã sẵn sàng cho buổi/quiz tiếp theo | Chưa có tiêu chí rõ; self-check là backlog sau MVP                   |

### 2.3 AI leverage point và giả thuyết sản phẩm

**AI leverage point:** bước `Execute`, cụ thể là quyết định nội dung nào trong PDF đủ quan trọng và đủ căn cứ để đưa vào outline/lời thoại, nội dung nào phải lược bỏ, cảnh báo hoặc dẫn người học về trang gốc.

Đây là quyết định trung tâm cần AI vì việc phân tích ngữ nghĩa và nén nội dung trên nhiều trang khó làm bằng rule cố định. Việc upload file, duyệt outline, dựng layout template và điều hướng về trang nguồn không nhất thiết cần AI.

**Product hypothesis:**

> Nếu giúp học viên muốn ôn lại một buổi nắm lại mạch bài ở bước ôn sau buổi, bằng cách chọn và diễn giải các ý chính có căn cứ từ PDF thành một video ngắn có chapter và liên kết trang nguồn, họ sẽ chuyển từ đọc tuần tự sang xem bản ôn tập trước rồi chỉ quay lại phần cần thiết, vì họ nhớ nhanh “buổi này có những gì” mà vẫn kiểm chứng được nội dung.

**Giả định nguy hiểm nhất:** người học thực sự muốn video và có thể hiểu narration nhanh; nếu họ cần scan/search/chỉnh sửa nhanh thì bản đồ text có nguồn sẽ hữu ích hơn video.

---

## 3. Kế hoạch evidence A — khảo sát tối thiểu 20 người

Không hỏi “Bạn có muốn tính năng tạo video bằng AI không?”. Hỏi về **lần gần nhất** để tránh câu trả lời xã giao.

### 3.1 Bộ câu hỏi

1. Lần gần nhất bạn ôn lại một buổi học là khi nào và để làm gì?
2. Khi đó, bạn đã ôn lại theo cách nào?
3. Bạn dùng slide, video, transcript, hỏi bạn hay bỏ qua? Hãy kể theo thứ tự thao tác.
4. Bạn mất khoảng bao lâu? Phần nào tốn thời gian nhất?
5. Bạn từng bỏ sót khái niệm nền tảng, yêu cầu hoặc ví dụ quan trọng nào không? Hậu quả là gì?
6. Khi xem một bản tóm tắt, bạn kiểm tra nó đúng bằng cách nào?
7. Nếu chỉ có 10 phút, bạn muốn nhận dạng nào trước: video có lời thoại, bản đồ text có nguồn, hay danh sách slide quan trọng? Vì sao?
8. Bạn có sẵn sàng thử prototype bằng một PDF bài học thật trước demo không? Nếu có, xin tên/vai trò và thời điểm có thể thử.

### 3.2 Quy tắc xác nhận pain

Chốt trước khi thu dữ liệu:

- Có ít nhất 20 người ngoài nhóm, lưu toàn bộ câu hỏi và câu trả lời nguyên văn.
- Pain được xác nhận nếu ít nhất 10/20 người kể được một lần ôn lại gần đây và đã phải đọc/tua/tìm kiếm qua nhiều nội dung hoặc mất thời gian rõ ràng.
- Preference video chỉ được xem là có tín hiệu nếu người trả lời chọn nó **sau khi mô tả hành vi gần nhất**, đồng thời giải thích lợi ích cụ thể; không tính câu “có cũng hay”.
- Nếu Catch-up Map text được chọn nhiều hơn hoặc người dùng cần scan/search hơn xem tuần tự, đổi output chính sang A2.
- Phải có ít nhất 3 người thật ngoài nhóm đồng ý thử prototype trước demo; lưu tên/vai trò trong log riêng có quyền truy cập phù hợp.

### 3.3 Mẫu log

| ID  | Tên/vai trò | Lần ôn lại gần nhất | Cách làm hiện tại | Phút tốn | Hậu quả | Format chọn + lý do | Đồng ý test? | Quote nguyên văn |
| --- | ----------- | ------------------- | ----------------- | -------: | ------- | ------------------- | ------------ | ---------------- |
| S01 | Chưa thu    |                     |                   |          |         |                     |              |                  |

---

## 4. Lát cắt prototype và Canvas CP1

### 4.1 Lát cắt MỘT CÂU

> Một học viên muốn ôn lại một buổi học từ một PDF hợp lệ; hệ thống quyết định ý nào đủ quan trọng và đủ căn cứ để đưa vào video, ý nào phải cảnh báo hoặc dẫn về nguồn; để người học nhận một video ôn tập tiếng Việt dưới 10 phút có chapter, slide minh họa và liên kết về đúng trang gốc.

Kiểm tra format:

- **1 user:** học viên muốn ôn lại một buổi đã học;
- **1 việc:** ôn lại mạch kiến thức từ một PDF;
- **1 quyết định AI:** chọn nội dung đủ quan trọng và đủ căn cứ để đưa vào;
- **1 kết quả:** video ngắn có thể kiểm lại theo trang nguồn.

### 4.2 Mức automation dự kiến

**Conditional automation.** Hệ thống tự tạo outline/script khi trích xuất được nội dung và trace về trang nguồn; nếu trang khó đọc, claim thiếu nguồn hoặc file không hợp lệ thì cảnh báo/dừng phần liên quan. Người dùng duyệt outline trước khi tạo narration/video.

**Lý do theo cost-of-error:** một video nói trôi chảy nhưng tóm tắt sai có thể làm người học học sai và khó phát hiện; chi phí xem/correct outline thấp hơn chi phí sửa hiểu sai sau đó. Vì vậy không automate hoàn toàn.

### 4.3 Canvas 7 dòng cho CP1

1. **Hướng:** A — tính năng AI mới trên VLearn.
2. **Job executor:** học viên đã học xong một buổi, có PDF slide và muốn ôn lại trước khi làm bài, làm quiz hoặc học tiếp.
3. **Pain:** học viên phải tự đọc/ghép mạch từ hàng chục slide hoặc hỏi từng đoạn; yêu cầu tổng hợp rộng đôi khi bị từ chối, khiến họ tốn thời gian và có nguy cơ bỏ sót ý nền tảng.
4. **Evidence ban đầu:** 141/1.261 lượt có nhu cầu `tóm tắt|tổng hợp`; 49/141 nhận refusal rõ; 582/1.261 câu trả lời không có citation. Phương pháp và 5 quote ở `evidence/mining-log.md`.
5. **Lát cắt:** một học viên + ôn lại một PDF + hệ thống quyết định nội dung quan trọng/có căn cứ + video dưới 10 phút có chapter và trang nguồn.
6. **Automation + willing users:** Conditional vì chi phí học sai cao; danh sách ≥3 willing users **chưa thu, phải hoàn tất sau khảo sát** — không được tự điền tên.
7. **Phân công:** **chưa có tên thành viên**; nhóm phải điền người phụ trách Product/Evidence, AI pipeline/Eval, Frontend/Video và User test/Demo trước khi nộp CP1.

---

## 5. Phạm vi để build nổi trong một ngày

### In-scope

- Một PDF có cấu trúc rõ, tối đa khoảng 80 trang.
- Một ngôn ngữ đầu ra: tiếng Việt.
- Một chế độ: video ôn tập dưới 10 phút.
- Outline 4–6 chapter để người dùng duyệt trước.
- Lời thoại, subtitle, slide template và liên kết chapter → trang nguồn.
- Ít nhất một lời gọi AI thật cho quyết định chọn/tóm tắt nội dung.
- Demo một happy path và một case khó/thiếu căn cứ.

### Non-goals

- Không hỗ trợ mọi loại PDF scan, chữ viết tay hoặc bố cục phức tạp.
- Không tạo avatar, hoạt hình sinh tự do hoặc dựng lại chính xác mọi biểu đồ/công thức.
- Không cá nhân hóa theo toàn bộ lịch sử học tập.
- Không chấm rằng người học “đã hiểu”; self-check là backlog.
- Không cam kết thay thế slide hoặc lời giảng gốc.
- Không xử lý nhiều buổi/toàn khóa trong MVP.

### Tiêu chí quyết định go/no-go trước khi build sâu

1. Evidence mining B giữ nguyên và tái tạo được.
2. Khảo sát đạt tối thiểu 20 người và ≥50% xác nhận pain theo rule đã chốt.
3. Có ít nhất 3 willing users có tên thật đồng ý thử.
4. Format video có lý do hành vi cụ thể; nếu không, pivot sang Catch-up Map text có nguồn.
5. Pipeline mẫu có thể tạo một artifact 2–3 phút từ một phần PDF trước; sau đó mới mở rộng mục tiêu dưới 10 phút.
