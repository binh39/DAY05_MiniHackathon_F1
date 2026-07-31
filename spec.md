# AI SPEC — Video ôn tập có căn cứ từ PDF bài giảng · Nhóm F1 · Zone D305

**Danh sách thành viên:** Đồng Đại Huy (2A202601901), Nguyễn Quang Tường (2A202601597), Nguyễn Đình Bình (2A202601091), Phạm Đình Minh (2A202601979), Phạm Đức Trung (2A202601253)

Hướng: [x] A — VLearn [ ] B — Trợ lý Học viên [ ] C — Làn mở
Loại: [ ] Tối ưu tính năng có sẵn [x] Tính năng mới

## §1. User & Job

### Job executor và workflow

**Job executor:** học viên đã kết thúc một buổi học, có PDF slide dài khoảng 40–80 trang trên VLearn và muốn xem lại kiến thức của chính buổi đó trong quỹ thời gian khoảng 10–20 phút.

Workflow hiện tại:

1. Tìm PDF, video/bản ghi, transcript hoặc ghi chú của đúng buổi học.
2. Đọc tuần tự slide, tua video hoặc hỏi AI Tutor từng đoạn.
3. Tự phân biệt ý chính, ví dụ và chi tiết; tự nối mạch giữa các slide.
4. Khi vẫn chưa rõ, hỏi lại tutor/bạn/TA hoặc đưa file sang một chatbot khác.
5. Kết thúc khi cảm thấy đã nắm được bài, dù khó kiểm phần nào còn thiếu.

Workflow mục tiêu:

1. Chọn một PDF bài học hợp lệ ngay trong VLearn và cấu hình video tiếng Việt dưới 10 phút.
2. Hệ thống phân tích PDF, tạo outline 4–6 chapter, hiện trang nguồn, coverage và warning.
3. Học viên sửa title, mục tiêu, thứ tự/mức chi tiết chapter rồi duyệt outline.
4. Hệ thống tạo script, visual, voice, subtitle và MP4 từ plan đã duyệt.
5. Học viên xem theo chapter và mở đúng trang slide gốc khi cần kiểm lại.

### Core JTBD

> Khi bắt đầu ôn lại một buổi đã học, tôi muốn nắm lại mạch kiến thức chính trong khoảng 10–20 phút và biết phần nào cần quay về tài liệu gốc, để không phải đọc tuần tự toàn bộ slide mà vẫn tránh hiểu sai bài.

### Problem statement

> Học viên muốn xem lại kiến thức sau buổi học trong thời gian ngắn nhưng phải tự lướt và ghép mạch từ 40–80 trang slide; nhiều slide chỉ có từ khóa hoặc hình ảnh, khiến họ tốn thời gian mà vẫn khó nối lại lời giảng và nắm được bức tranh tổng thể của buổi học.

### Evidence

#### Khảo sát pain và lựa chọn định dạng

Nguồn tổng hợp: [`phản hồi form khảo sát.png`](ph%E1%BA%A3n%20h%E1%BB%93i%20form%20kh%E1%BA%A3o%20s%C3%A1t.png).

| Tín hiệu                                                   |       Kết quả | Điều được phép kết luận                                 |
| ---------------------------------------------------------- | ------------: | ------------------------------------------------------- |
| Muốn ôn nhanh trong 10–15 phút nhưng phải lướt nhiều slide |   18/25 (72%) | Pain thời gian vượt ngưỡng 50%                          |
| Đã xem slide nhưng không nối lại được lời giảng            |   18/25 (72%) | Workaround hiện tại chưa khôi phục đủ ngữ cảnh          |
| Slide có từ khóa/hình nhưng thiếu diễn giải                |   14/25 (56%) | Chỉ rút gọn chữ chưa giải quyết đủ pain                 |
| Khó nắm bức tranh tổng thể                                 |   13/25 (52%) | Cần tái cấu trúc mạch bài, không chỉ tìm trang          |
| Đọc slide từ đầu đến cuối                                  |   20/25 (80%) | Đọc tuần tự là workaround phổ biến                      |
| Chọn video tóm tắt 5–8 phút                                | 15/31 (48,4%) | Video đứng đầu sáu định dạng, chưa phải đa số tuyệt đối |
| Chọn slide/infographic 3–5 phút                            |  8/31 (25,8%) | Phương án đứng thứ hai và là fallback đáng giữ          |

**Trạng thái chuẩn A:** hai ảnh chứng minh kết quả tổng hợp với cỡ mẫu ≥20, nhưng repo chưa có log từng câu trả lời nguyên văn để kiểm lại đầy đủ. Vì vậy spec không tự nhận khảo sát đã hoàn tất toàn bộ chuẩn A cho tới khi nhóm bổ sung raw response log đã được phép dùng.

#### Mining chuẩn B

Log đầy đủ, SHA-256 nguồn, rule đếm chạy lại được và trích dẫn tối thiểu nằm tại [`evidence/mining-log.md`](evidence/mining-log.md).

- 2.522 message = 1.261 lượt học viên–tutor, 369 học viên ẩn danh, trong giai đoạn 22–29/07/2026.
- 1.252/1.261 lượt (99,3%) có ngữ cảnh trang/đoạn được chọn.
- 141/1.261 lượt (11,2%) chứa yêu cầu `tóm tắt|tổng hợp`; 49/141 (34,8%) gặp refusal rõ theo rule hẹp.
- 582/1.261 lượt (46,2%) không có citation; con số này tạo lý do cho source trace nhưng không chứng minh các câu trả lời đều sai.

Năm ví dụ nguyên văn rút ngắn:

| Turn    | Trích dẫn học viên                                     | Kết quả tutor                                       |
| ------- | ------------------------------------------------------ | --------------------------------------------------- |
| `T0135` | “tóm tắt nội dung các giai đoạn được mô tả trên slide” | Không tìm được nội dung giai đoạn/biểu đồ; downvote |
| `T0404` | “Tổng họp thông tin của toàn bộ bài giảng hôm nay”     | Không thể truy xuất nội dung tổng hợp; downvote     |
| `T0443` | “tóm tắt toàn bộ slide”                                | Không trả về tóm tắt tổng quát; downvote            |
| `T0776` | “giải thích và tóm tắt nội dung học hôm này”           | Không tìm thấy phần tóm tắt tổng quát; downvote     |
| `T0938` | “tóm tắt tất cả nội dung cần note lại đầy đủ”          | Không truy cập nội dung slide để tóm tắt; downvote  |

## §2. Impact & quyết định chọn

Tần suất theo tuần và số phút mất mỗi lần chưa được khảo sát, nên không tự gán ROI. Bảng dưới dùng đúng số người/lượt đã quan sát và mô tả cơ chế chi phí cần tiếp tục xác minh.

| Ứng viên                                             |                                                                     Bao nhiêu người/lượt gặp | Tần suất                          | Mỗi lần tốn gì?                                     | Khả thi                 | Quyết định                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------: | --------------------------------- | --------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| A1 — Bản đồ ôn tập dạng văn bản có nguồn             |            18/25 muốn ôn nhanh; 13/25 khó nắm toàn cảnh; 141 lượt mining có nhu cầu tổng hợp | Sau buổi học; chưa đo số lần/tuần | Tự đọc và nối ý; khó khôi phục lời giảng            | Rất cao                 | **Dự phòng:** phù hợp nếu user cần scan/search hơn xem video                 |
| A2 — Video ôn tập dưới 10 phút có narration và nguồn | 18/25 muốn ôn nhanh; 18/25 không nối được lời giảng; 14/25 thiếu diễn giải; 15/31 chọn video | Sau buổi học; chưa đo số lần/tuần | Lướt nhiều slide, tự tái cấu trúc và khó kiểm nguồn | Working prototype đã có | **Chọn để kiểm chứng:** chạm đồng thời pain thời gian, diễn giải và mạch bài |
| A3 — Điều hướng tới 5–7 slide quan trọng             |                                       20/25 đọc từ đầu đến cuối; 18/25 phải lướt nhiều slide | Sau buổi học                      | Giảm số trang nhưng vẫn thiếu lời diễn giải         | Rất cao                 | **Loại:** chưa giải quyết pain “không nối lại được lời giảng”                |
| A4 — Tutor tạo bản tổng hợp toàn buổi dạng chữ       |                            17/25 đã dùng VLearn Tutor; 49/141 request tổng hợp bị refusal rõ | Khi xem lại hoặc đang học         | Hỏi nhiều lần, câu trả lời có thể thiếu citation    | Cao                     | **Loại:** quá gần tutor hiện tại và ít khác A1                               |

**Ứng viên chọn:** A2. Video được chọn nhiều nhất trong khảo sát định dạng với 15/31 (48,4%), gần gấp đôi slide/infographic 8/31 (25,8%). Tuy nhiên lựa chọn chỉ là ưu tiên khai báo; CP5 phải đo xem người học có bắt đầu xem, xem hết, mở nguồn và muốn dùng lại hay không.

**Khả thi kỹ thuật:** run representative đã phân tích 45/45 trang, 50/50 source, render 84/84 scene và tạo MP4/SRT/coverage. Run duration contract 1–3 phút tạo video 75,82 giây trong khoảng 60–180 giây. Chi tiết tại [`codebase/backend/eval/`](codebase/backend/eval/).

## §3. Giải pháp tương tự đã nghiên cứu

Chi tiết bốn câu hỏi cho từng sản phẩm và nguồn chính thức nằm trong [`brainstorm3.md`](brainstorm3.md). Hiện đây là desk research có thể kiểm tra nguồn; nhóm vẫn phải bổ sung ảnh/ghi chú hands-on theo yêu cầu của guide trước khi tuyên bố đã dùng thử trực tiếp.

| Sản phẩm                   | Flow                                                                                                     | Đáng học                                                             | Đáng né                                                                                                                                     | Mình khác gì ở lát cắt này?                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| NotebookLM Video Overviews | Upload/chọn nguồn → chọn format, ngôn ngữ, visual style, steering → generate → xem/feedback              | Giới hạn artifact theo source set và cho user steering trước khi tạo | Flow video công khai không mô tả checkpoint duyệt outline; video có thể sai/lỗi âm thanh, citation trong video không được tài liệu xác nhận | Bắt buộc duyệt outline; mỗi chapter/ý map về trang gốc; thiếu căn cứ thì cảnh báo hoặc loại        |
| Google Vids                | Prompt +`@` PDF/Slides → outline/scene/script/voiceover → sửa từng scene → export                        | AI tạo bản nháp có cấu trúc và sửa được trước khi xuất               | Đòi hỏi user biết prompt/dựng video; không đặt truy xuất trang nguồn làm trung tâm                                                          | Không cần prompt; lấy ngữ cảnh VLearn, chỉ cho sửa quyết định nội dung, dùng template cố định      |
| Synthesia Assistant        | Prompt + file → đặt audience/duration/style/template → draft → sửa script/visual trong editor → generate | Hỏi ràng buộc trước khi sinh và giữ output có thể sửa                | Avatar/voice bóng bẩy có thể làm claim thiếu căn cứ trông đáng tin; tài liệu không mô tả citation theo trang                                | `Grounding trước, trình bày sau`; không dùng avatar trong MVP; outline phải duyệt trước TTS/render |
| Canva Video Presentation   | Import/tạo presentation → chỉnh slide/media/animation → ghi narration/caption → xuất video               | Editor trực quan và template ổn định                                 | User vẫn phải đóng vai content creator; phần chọn/kiểm chứng kiến thức chưa được giải quyết                                                 | Tự động hóa sản xuất lặp lại, nhưng giữ user quyết định outline, nguồn và narration                |

**Khác biệt chốt:** không cạnh tranh bằng video đẹp hơn; VLearn tạo **video ôn tập có thể kiểm chứng** với checkpoint duyệt outline và liên kết `chapter/ý trong script → trang slide gốc` xuyên suốt trải nghiệm.

## §4. Thiết kế

### Lát cắt MỘT CÂU

> Một học viên muốn ôn lại một buổi học từ một PDF hợp lệ dài 40–80 trang; hệ thống quyết định ý nào đủ quan trọng và đủ căn cứ để đưa vào video, ý nào phải cảnh báo hoặc dẫn về nguồn; để người học nhận một video ôn tập tiếng Việt dưới 10 phút có chapter, slide minh họa và liên kết về đúng trang gốc.

### Non-goals

1. Không hỗ trợ PDF trên 80 trang/50 MB, PDF mã hóa, chữ viết tay hoặc scan/bố cục bất thường với cam kết chính xác tuyệt đối.
2. Không tạo avatar, generative video, animation code tự do hoặc dựng lại chính xác mọi công thức/biểu đồ phức tạp.
3. Không chấm rằng học viên đã hiểu, không tự suy ra lỗ hổng cá nhân và không thay thế slide/lời giảng gốc.
4. Không cá nhân hóa theo toàn bộ lịch sử học tập hoặc xử lý nhiều buổi/toàn khóa trong MVP.
5. Không build editor media/animation tổng quát; chỉ sửa title, objective, thứ tự và mức chi tiết chapter.
6. Không dùng dữ liệu ngoài data pack/data giả, không commit API key hay thông tin nhận diện cá nhân.

### Mức prototype

[ ] Sketch [ ] Mock [x] **Working**

- **Thật:** upload/API, Firebase Auth, Vertex AI/Gemini cho Module 1–4, outline approval, Remotion visual, Google Cloud TTS, FFmpeg compose, MP4/SRT/coverage, chapter/source navigation, feedback và quota.
- **Không mock lõi:** job mới chạy Module 1–2 rồi dừng `AWAITING_APPROVAL`; sau khi user duyệt mới resume Module 3–6.
- **Chưa hoàn tất:** human watch/listening validation, đủ golden PDF set, encrypted/prompt-injection fixture trong baseline và App Check/security hardening.

### Automation

[ ] Augment [x] **Conditional** [ ] Automate

Hệ thống tự phân tích và tạo artifact khi source/contract/validator hợp lệ. User bắt buộc duyệt outline trước khi tạo video. Trang khó đọc được gắn warning; grounded claim thiếu/sai source bị reject/repair; crop thiếu bounding box fallback về trang gốc; file ngoài phạm vi bị chặn trước model call.

**Lý do theo cost-of-error:** video nói trôi chảy nhưng tóm tắt sai có thể khiến học viên học sai mà khó nhận ra; chi phí xem/sửa outline thấp hơn chi phí sửa hiểu sai sau đó. Vì vậy không automate hoàn toàn.

### §4b. Nguyên tắc HAX/PAIR đã áp dụng

| Nguyên tắc                         | Áp cụ thể vào đâu trong prototype                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| G1 — Làm rõ hệ thống làm được gì   | Trang tạo video và upload giới hạn PDF 50 MB/80 trang; MVP chỉ hứa tạo bản ôn từ tài liệu người dùng cung cấp                    |
| G2 — Làm rõ nó làm tốt đến đâu     | Outline hiện warning, unreadable source, coverage và thumbnail; result player hiện coverage/source thay vì nói “đã hiểu toàn bộ” |
| G10 — Thu hẹp phạm vi khi nghi ngờ | Module 1 giữ warning; Module 3 chặn claim thiếu source; Module 4 fallback visual; PDF ngoài giới hạn bị từ chối                  |
| G8 — Gạt bỏ dễ dàng                | User có thể cancel/retry job và chưa phải render video nếu không duyệt outline                                                   |
| G9 — Sửa dễ dàng                   | User sửa title, learning objective, thứ tự và detail level chapter; plan gốc được backup trước khi resume                        |
| G11 — Giải thích vì sao            | Grounded claim trace về`source_id`; chapter mở đúng ảnh trang PDF đã dùng                                                        |
| G15 — Mời feedback chi tiết        | Result player hỏi rating, accuracy, clarity, duration fit, ý định dùng lại và chỗ khó hiểu/sai                                   |
| PAIR — Errors & Graceful Failure   | Phân biệt file không hợp lệ, nguồn khó đọc, claim không căn cứ, lỗi TTS và lỗi render; mỗi loại có đường lui riêng               |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản

| ID  | Lớp                        | Tình huống cụ thể                                              | Hành vi mong muốn: nói gì, hiện gì, cho user làm gì tiếp                                               | Nguyên tắc      |
| --- | -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------- |
| R1  | ① Nguồn sự thật            | Script có grounded claim nhưng thiếu`source_id`                | Chặn chapter, hiện “Ý này chưa có nguồn trong PDF”, repair riêng chapter hoặc cho user bỏ ý            | G10, G11        |
| R2  | ① Nguồn sự thật            | Claim cite đúng trang nhưng sai element/chapter                | Semantic validator chặn completed output, log mismatch và sinh lại chapter; không chỉ sửa số trang     | G2, G10, G11    |
| R3  | ① Nguồn sự thật            | PDF chứa prompt injection yêu cầu model bỏ qua quy tắc         | Coi nội dung là data, không làm theo instruction; ghi warning và không đưa instruction vào narration   | G10, PAIR       |
| R4  | ② Mơ hồ/thiếu thông tin    | Trang có chữ nhỏ, hình hoặc OCR confidence thấp                | Hiện thumbnail + warning “Không đọc chắc trang N”; user mở trang, bỏ source hoặc tiếp tục với giới hạn | G2, G10         |
| R5  | ② Mơ hồ/thiếu thông tin    | Scene cần crop nhưng không có bounding box                     | Fallback`ORIGINAL_PAGE`, giữ warning; không bịa tọa độ highlight                                       | G10, G11        |
| R6  | ② Mơ hồ/thiếu thông tin    | Title/mục tiêu quá chung làm outline lệch nhu cầu              | Cho user sửa objective và chapter trước duyệt; không render khi chưa approve                           | G9, G17/Control |
| R7  | ③ Ngoài phạm vi/thẩm quyền | Upload file không phải PDF hoặc sai magic bytes                | Từ chối trước pipeline, nói định dạng hợp lệ và cho chọn file khác                                     | G1, G10         |
| R8  | ③ Ngoài phạm vi/thẩm quyền | PDF vượt 80 trang/50 MB, mã hóa hoặc hỏng                      | Nói rõ giới hạn; gợi ý dùng bản không mã hóa hoặc tách đúng một buổi rồi upload lại                    | G1, G10         |
| R9  | ③ Ngoài phạm vi/thẩm quyền | User yêu cầu hệ thống chấm “đã hiểu” hoặc tạo đáp án ngoài PDF | Nói tính năng chỉ tạo bản ôn dựa trên PDF; dẫn về slide/tutor thay vì tự suy đoán                      | G1, G10         |
| R10 | ④ Đặc thù domain           | Duration estimate lệch TTS, video vượt khoảng đã chọn          | Timeline dùng WAV thật; final duration gate chặn output ngoài contract; báo cần rút gọn/regenerate     | G2, G10, G11    |
| R11 | ④ Đặc thù domain           | Công thức/code/biểu đồ bị tóm tắt làm đổi nghĩa                | Ưu tiên hiện trang gốc, giữ source link và warning; không diễn giải nếu validator không đủ căn cứ      | G10, G11        |
| R12 | ④ Đặc thù domain           | TTS lỗi hoặc text/contrast làm scene không dùng được           | Retry tối đa ba lần; layout QA/fallback; không đánh dấu job COMPLETED khi còn scene`FAILED`            | G2, PAIR        |

**Failure đáng sợ nhất khi demo:** R2 — lời thoại nghe hợp lý và cite một trang có thật nhưng gán sai element/chapter. Đây là lỗi “có vẻ có căn cứ” nên dễ làm học viên tin sai hơn lỗi từ chối rõ ràng.

## §6. Bốn đường đi của trải nghiệm

| Đường đi                 | Trigger                                                    | Hệ thống nói/hiện gì?                                                       | User làm gì tiếp?                                          |
| ------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Happy path               | PDF hợp lệ, cấu trúc rõ, nguồn đủ                          | Upload progress → outline + coverage → approve → video/chapter/SRT/source   | Xem video, nhảy chapter, mở trang gốc, gửi feedback        |
| Low-confidence (②)       | OCR/source confidence thấp hoặc thiếu bbox                 | Warning và thumbnail; source không được đánh dấu chắc chắn; visual fallback | Mở trang kiểm, bỏ/chỉnh chapter hoặc tiếp tục với giới hạn |
| Failure/không căn cứ (①) | Claim thiếu source hoặc citation mismatch                  | Validator chặn/repair chapter, không cho job COMPLETED che lỗi              | Chờ repair, bỏ ý hoặc quay lại outline                     |
| Correction               | User thấy mục tiêu/thứ tự chưa đúng                        | Cho sửa title, objective, thứ tự/detail level; giữ original plan            | Lưu draft và duyệt plan mới; pipeline resume từ Module 3   |
| Ngoài phạm vi (③)        | Sai file, quá limit, mã hóa hoặc đòi output ngoài nhiệm vụ | Lỗi cụ thể + giới hạn + cách chuẩn bị lại file; không gọi model             | Chọn/tách/giải mã PDF hoặc dùng công cụ phù hợp khác       |
| Case domain (④)          | Công thức/code khó, TTS/render/duration lỗi                | Hiện trang gốc/warning hoặc trạng thái module lỗi; không báo hoàn tất giả   | Kiểm source, retry đúng module hoặc rút gọn outline        |

## §7. Kiểm thử

### Chiều chất lượng và định nghĩa kiểm chứng được

| Chiều                  | Pass khi                                                                                                               | Cách kiểm                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Grounding/traceability | 100% grounded claim có`source_id` hợp lệ; không cite sai element/chapter trong output COMPLETED                        | Zod, Grounding Validator, semantic review và mở source trace     |
| Coverage               | Mode FULL phân loại 100% page/source; phần không dạy vẫn có treatment/warning, không biến mất                          | `coverage-manifest` và `coverage-report.json`                    |
| Duration fit           | MP4 cuối nằm trong khoảng user chọn; timeline dùng duration WAV thật; case estimator chấm theo expected của golden set | Config contract, voice manifest, FFprobe và final duration gate  |
| Media integrity        | 0 scene`FAILED`; MP4 H.264/AAC có audio, SRT monotonic, chapter timestamp nằm trong duration                           | Manifest, FFprobe và subtitle/video validator                    |
| UX safety/control      | File ngoài phạm vi bị chặn rõ; outline xuất hiện và sửa được trước render; warning/source mở được                      | API/integration test và browser E2E                              |
| Usefulness học tập     | Người thử nêu lại được mạch chính, hiểu giới hạn nguồn và muốn dùng lại trong tình huống cụ thể                        | User validation ≥5 người; chưa có kết quả nên không tự đánh PASS |

### Golden set

[`eval/golden-set-v1.md`](eval/golden-set-v1.md) có 20 case:

- 8 case thường `G01–G08`;
- 8 case cho bốn lớp chỗ khó, mỗi lớp 2 case `G09–G16`;
- 4 case hiếm `G17–G20`;
- 10 case được phát triển từ mã turn thật trong chatlog, không sao chép data pack ra artifact.

### Quality bar đã chốt

> **Đạt khi ≥90% (18/20) case pass, mọi case P0 đã được chạy, 0 grounded claim thiếu/sai `source_id` trong output COMPLETED, 0 video COMPLETED có scene `FAILED`, và warning/fail còn lại được giữ nguyên trong report.**

Bar này giữ nguyên sau baseline; không hạ ngưỡng khi kết quả thấp.

### Kết quả các lượt chạy

| Lượt                |  PASS |         FAIL |             NOT RUN | Pass rate | So với bar     | Kết luận     |
| ------------------- | ----: | -----------: | ------------------: | --------: | -------------- | ------------ |
| Run 01 — 30/07/2026 | 17/20 | 1/20 (`G15`) | 2/20 (`G17`, `G18`) | **85,0%** | Thiếu 5 điểm % | **Chưa đạt** |

Nguồn: [`eval/run-01-2026-07-30.md`](eval/run-01-2026-07-30.md).

- `G15` fail vì estimate 1.634 giây so với WAV thật 902,56 giây, lệch -44,8%; mitigation là timeline dùng audio thật nhưng estimator vẫn chưa qua expected ≤20%.
- `G17` encrypted/corrupt PDF và `G18` prompt injection chưa có fixture/run nên tính 0, không đổi thành PASS bằng review code.
- Run representative cũ tạo MP4 908,121 giây, vượt mục tiêu dưới 10 phút. Run duration-contract mới với option 1–3 phút tạo MP4 75,82 giây trong khoảng 60–180 giây, nhưng cần rerun toàn bộ golden set trước khi kết luận regression đã được giải quyết.
- Technical suite gần nhất: backend typecheck pass, 55/55 test pass, frontend production build pass; đây không thay thế golden pass rate hoặc user validation.

Kế hoạch run tiếp theo:

1. Tạo fixture PDF encrypted/corrupt và prompt-injection, chạy `G17–G18` thật.
2. Hiệu chỉnh estimator theo voice/narration kind; giữ final duration gate.
3. Chạy lại toàn bộ 20 case với SHA-256 fixture, model/config/version và lưu cả fail.
4. Bổ sung ít nhất bốn PDF golden được phép dùng và human watch/listening evaluation.

## §8. Phân công & kế hoạch

### Phân công có tên

| Vai trò          | Người phụ trách    | Artifact/đầu ra                                    |
| ---------------- | ------------------ | -------------------------------------------------- |
| Spec + evidence  | Đồng Đại Huy       | `spec.md`, `evidence/mining-log.md`                |
| Eval/prompt      | Nguyễn Quang Tường | `eval/golden-set-v1.md`, run log, failure analysis |
| Backend/pipeline | Nguyễn Đình Bình   | `codebase/backend/src/`, contract/validator        |
| Web/demo         | Phạm Đình Minh     | `codebase/frontend/`, demo flow và dry run         |
| Validation       | Phạm Đức Trung     | `validation/feedback-log.md` tại CP5               |

### Willing users và validation CP5

| Willing user giả định | Vai trò/tình huống catch-up                                                | Cam kết thử trong kịch bản mô phỏng                                          |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Nguyễn Minh Anh       | Thường đọc lại toàn bộ slide sau buổi; cần ôn trước buổi kế tiếp           | Đồng ý dành 10 phút thử happy path và kiểm tra một chapter theo trang nguồn  |
| Trần Hoàng Nam        | Từng dùng VLearn Tutor để hỏi từng đoạn; gặp khó khi cần tổng hợp toàn bài | Đồng ý thử PDF có một trang khó đọc và đánh giá warning/đường lui            |
| Lê Thu Hà             | Thường chỉ có 10–15 phút để xem lại bài và ưu tiên nội dung ngắn           | Đồng ý so sánh video với bản đồ text, đánh giá thời lượng và ý định dùng lại |

Hai người dự phòng cho vòng validation ≥5 người: **Phạm Gia Bảo** (thường tua lại bản ghi bài học) và **Vũ Khánh Linh** (thường dùng chatbot ngoài để tóm tắt PDF). Đây cũng là persona mô phỏng, phải thay/xác nhận bằng người thật trước CP5.

Task 10 phút: “Hãy dùng PDF buổi học này để nắm lại mạch bài và tìm một phần bạn muốn kiểm tra kỹ; hãy thao tác như khi tự học.” Người quan sát im lặng, ghi lại bấm gì, kẹt đâu, có xem hết/nhảy chapter/mở nguồn không.

Ba câu hỏi sau task:

1. “Điều gì khó hiểu hoặc khó chịu nhất?”
2. “Kết quả này bạn có tin không — vì sao?”
3. “Bạn có dùng thật không — vì sao hoặc vì sao chưa?”

Phạm Đức Trung log tại `validation/feedback-log.md`: tên/vai, willing user?, task, quan sát, quote nguyên văn, mức nghiêm trọng. Sau năm phiên, chốt chủ đề lặp, 1–2 thay đổi trước demo, phần giữ nguyên có lý do và backlog.

### Multi-prototype

**Trục có tên:** dạng output cho job catch-up.

- Phương án A: bản đồ/summary văn bản có nguồn — quét và tìm kiếm nhanh, build rẻ.
- Phương án B: video có narration, chapter, subtitle và source trace — phục hồi mạch/lời diễn giải nhưng khó scan hơn.

Chọn B để kiểm chứng vì 15/31 chọn video, cao nhất và gần gấp đôi phương án slide/infographic 8/31; đồng thời 18/25 không nối lại được lời giảng. Giữ A làm fallback: nếu validation cho thấy người dùng chủ yếu nhảy chapter/tìm chữ và không xem narration, quay về chapter map/text thay vì thêm hiệu ứng video.

## §9. Changelog

| Thời điểm            | Đổi gì                                                                                                   | Vì sao / trỏ về bằng chứng                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 30/07/2026           | Neo pain catch-up vào mining log, không tuyên bố người học mặc nhiên cần video                           | `evidence/mining-log.md`: 141 lượt tổng hợp, 49 refusal theo rule |
| 30/07/2026           | Chốt quality bar 90%, tạo golden set 20 case và baseline                                                 | `eval/golden-set-v1.md`, `eval/run-01-2026-07-30.md`              |
| 30/07/2026           | Giữ`G15` fail và `G17–G18` NOT RUN                                                                       | Không che duration estimate lệch -44,8% hoặc fixture còn thiếu    |
| 30/07/2026           | Bổ sung final duration contract và E2E option 1–3 phút                                                   | `codebase/backend/eval/duration-contract-1-3-e2e-2026-07-30.md`   |
| 31/07/2026           | Chuyển hướng đặc tả sang tính năng mới trên VLearn, cập nhật khảo sát 25/31 phản hồi                     | `brainstorm 1 2.md`, hai ảnh khảo sát                             |
| 31/07/2026           | Benchmark NotebookLM, Google Vids, Synthesia, Canva; chốt checkpoint outline + source trace là khác biệt | `brainstorm3.md`                                                  |
| 31/07/2026           | Tạo lại spec theo đủ §1–§9 và cập nhật đường dẫn prototype hiện tại                                      | `02-guide.md`, `03-template-ai-spec.md`, `codebase/`              |
| 31/07/2026           | Điền 3 willing users và 2 người dự phòng dạng persona để rehearsal validation                            | Dữ liệu mô phỏng; phải thay bằng consent thật trước CP5           |
| CP5 — chưa thực hiện | Cập nhật willing users, feedback log, thay đổi từ validation và rerun                                    | Không được đổi quality bar; chỉ bổ sung evidence/kết quả          |
