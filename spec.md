# AI SPEC — Catch-up video có căn cứ từ một PDF bài giảng

Hướng: [x] C — Làn mở
Loại: [x] Tính năng mới
Prototype: [`ai-lecture-video/`](ai-lecture-video/README.md)
Trạng thái CP4: bản đặc tả gần cuối; quality bar ở §7 được chốt trong phiên bản này và không được nới sau khi xem kết quả đo.

> **Lưu ý trung thực:** bằng chứng hiện có chứng minh pain *cần bắt kịp/tổng hợp bài học*; nó chưa chứng minh người học ưu tiên định dạng video hơn mọi định dạng khác. Video có căn cứ là giả thuyết giải pháp sẽ kiểm chứng với user ở CP5, không phải kết luận đã được chứng minh.

## §1. User & Job

### Job executor và workflow

**Học viên vừa nghỉ hoặc tụt nhịp một buổi học, đang có PDF/slide hợp lệ của buổi đó và cần ôn trước buổi tiếp theo.** Họ hiện phải mở từng slide, tự đoán thứ tự kiến thức và hỏi tutor từng đoạn; khi yêu cầu tổng hợp rộng, tutor thường không trả được câu trả lời có thể dùng ngay.

Workflow mục tiêu:

1. Học viên có quyền dùng một PDF bài giảng có cấu trúc, tối đa 80 trang/50 MB.
2. Upload PDF, xem outline và cảnh báo những phần hệ thống không đọc chắc chắn.
3. Duyệt/sửa thứ tự chapter hoặc mục tiêu học trước khi tạo video.
4. Xem video tiếng Việt có chapter, subtitle, liên kết về trang nguồn và coverage report.
5. Quay lại đúng chapter/trang gốc khi cần kiểm lại, thay vì tin một bản tóm tắt không có căn cứ.

### Core JTBD

> Khi tôi cần bắt kịp một buổi đã lỡ hoặc không theo kịp, tôi muốn nắm lại mạch kiến thức và biết chỗ nào phải quay về tài liệu gốc, để có thể theo buổi tiếp theo mà không tự ghép từng slide hoặc hỏi lại nhiều lần.

### Problem statement

Học viên cần tổng hợp lại một buổi học dài nhưng công cụ hiện tại thường chỉ trả lời cục bộ hoặc từ chối yêu cầu tổng hợp, làm họ mất mạch học và phải tự tái cấu trúc tài liệu.

### Evidence — mining chuẩn B

Log có phương pháp đếm, hash nguồn, các điều kiện lọc và 5 ví dụ nguyên văn ngắn nằm ở [`evidence/mining-log.md`](evidence/mining-log.md).

- Nguồn: 2.522 message / 1.261 lượt học viên–tutor, 369 học viên ẩn danh, 22–29/07/2026.
- 1.252/1.261 lượt (99,3%) chứa ngữ cảnh trang/đoạn được chọn: người học đã cố cung cấp context thay vì chỉ hỏi chung chung.
- Với rule có thể chạy lại trong log, 141 lượt yêu cầu có từ khóa `tóm tắt` hoặc `tổng hợp`; 49/141 (34,8%) nhận phản hồi nêu rõ không thể/tìm thấy để tổng hợp. Đây là tín hiệu về job catch-up, không phải đo lường nhu cầu xem video.
- Tutor không trích dẫn ở 582/1.261 lượt (46,2%); vì vậy prototype phải cho user kiểm lại nguồn, không chỉ tạo lời giảng trôi chảy.

**Giới hạn evidence:** chưa có khảo sát ≥20 người về lần gần nhất họ bắt kịp bài và chưa có 3 willing users có tên. Không được trình bày đây là evidence khảo sát; hai việc này là đầu việc CP5.

## §2. Impact & quyết định chọn

Các con số dưới đây là *số lượt trong mining*, không suy rộng thành số người sẽ dùng hoặc số giờ đã tiết kiệm. “Tốn gì” là cơ chế chi phí đã quan sát/giả thuyết cần xác minh, không phải số giờ tự khai.


| Ứng viên                                            |                                                 Tín hiệu quy mô có thể kiểm lại | Tần suất/pain                                    | Tốn gì mỗi lần                                                     | Khả thi trong prototype                                                      | Quyết định                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------: | -------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 — Context Rescue: giải thích đoạn đang chọn | ~573/1.261 lượt làm rõ; 179 lượt retrieval/context fail trong phân tích mining | Cao; cần ngay trong giờ                          | Hỏi lại, mất mạch học; có downvote ở các case cite/context sai | Cao                                                                           | Loại vì codebase hiện hữu không phải VLearn selected-text tutor; đổi sản phẩm lúc CP4 sẽ tạo prototype lệch spec                           |
| A2 — Catch-up Map dạng văn bản                    |           141 lượt có từ khóa tổng hợp; 49 refusal theo rule trong evidence log | Trung bình–cao                                   | Người học tự ghép slide, có thể bỏ prerequisite                | Cao                                                                           | Loại vì chỉ trả lại một summary tĩnh; không kiểm được lời giảng, subtitle, timeline và source coverage đang là lợi thế build đã có |
| C1 — Catch-up video có căn cứ từ PDF             |   Cùng 141 lượt nhu cầu tổng hợp; 5 case downvote tiêu biểu trong evidence log | Trung bình–cao; preference video chưa xác minh | Tự tái cấu trúc tài liệu và không có đường kiểm nguồn    | Đã có Working prototype cho một PDF 45 trang: chapter, MP4, SRT, coverage | **Chọn có điều kiện**: build phù hợp nhất, nhưng CP5 phải xác nhận format video thực sự hữu ích                                          |

**Ứng viên đã loại:** A1 có evidence mạnh nhất nhưng không khớp với prototype hiện tại. A2 khớp pain hơn nhưng không tận dụng được sự kiểm chứng nguồn/outline/video đã build. Không giữ cả ba trong MVP.

**Lý do chọn có số:** prototype C1 đã chạy trên PDF 45 trang với 45/45 trang, 50/50 source coverage, 84/84 segment render thành công và video 908,121 giây; chi tiết ở [`ai-lecture-video/eval/checklist-audit-2026-07-30.md`](ai-lecture-video/eval/checklist-audit-2026-07-30.md). Điều này chứng minh **khả thi kỹ thuật**, không thay thế xác nhận desirability ở CP5.

## §3. Giải pháp tương tự đã nghiên cứu


| Sản phẩm                                                                                                  | Flow quan sát                                                                         | Đáng học                                                                                                 | Đáng né                                                                                                     | Khác biệt có chủ đích của MVP                                                                        |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [Google NotebookLM](https://edu.google.com/ai-notebooklm/)                                                  | Nạp nguồn → tạo overview/audio/video và hỏi đáp bám nguồn                    | Lấy nguồn người dùng đưa vào làm giới hạn knowledge; biến cùng nguồn thành nhiều dạng học | Không coi output tổng quan là đủ để xác minh chi tiết của từng claim                                | Lưu`source_id` cấp element, coverage report và link chapter về đúng trang nguồn                      |
| [Microsoft Reading Coach](https://support.microsoft.com/en-us/education/getting-started-with-reading-coach) | Người học đọc → hệ thống phản hồi theo lỗi/độ trôi chảy → luyện tiếp | Phản hồi phải gắn với hành vi học, không chỉ tạo nội dung                                        | Không mở rộng MVP thành hệ thống chấm điểm/coach toàn diện khi chưa có dữ liệu learning outcome | MVP chỉ giúp bắt kịp bằng video có truy vết; self-check/đánh giá hiểu là backlog sau validation |

## §4. Thiết kế

### Lát cắt MỘT CÂU

> Một học viên cần bắt kịp một buổi học từ một PDF hợp lệ; hệ thống quyết định phần nào đủ căn cứ để đưa vào video/chapter và phần nào phải cảnh báo hoặc giữ nguyên nguồn; để học viên nhận video tiếng Việt có thể kiểm lại theo chapter và trang gốc.

### Non-goals

1. Không nhận PDF trên 80 trang/50 MB, PDF mã hóa, chữ viết tay hoặc scan/bố cục bất thường với cam kết chính xác tuyệt đối.
2. Không tạo avatar, generative video, animation code tự do hoặc dựng lại mọi công thức/biểu đồ phức tạp.
3. Không chấm mức độ hiểu, tự suy ra lỗ hổng cá nhân hay bảo đảm người xem đã học xong.
4. Không hỗ trợ `CONCISE`/`SUMMARY` trong lời hứa MVP; chỉ `FULL` đã được quality-test ở mức representative.
5. Không dùng PDF/tài liệu mà user không có quyền dùng; không commit API key hoặc dữ liệu nhận diện cá nhân.

### Mức prototype

**Working.** Pipeline thật dùng PDF → phân tích → outline review → script/storyboard → visual + Google Cloud TTS → MP4/SRT/coverage. Có Vertex AI/Gemini, Zod validator, Remotion, FFmpeg và API/web UI thật. Không mock pipeline trung tâm.

Phần chưa hoàn chỉnh: chưa có golden PDF đủ bộ, chưa có human listening/watch evaluation, chưa có timeout riêng từng module, và chưa test `CONCISE`/`SUMMARY`. Danh sách audit đầy đủ: [`ai-lecture-video/Checklist.md`](ai-lecture-video/Checklist.md).

### Automation: Conditional

Hệ thống tự tạo artifact **chỉ** khi source/contract/validator hợp lệ; nếu OCR/nguồn không chắc thì cảnh báo, nếu thiếu source cho grounded claim thì reject/repair, nếu visual crop thiếu bounding box thì fallback sang trang gốc. User duyệt outline trước khi Module 3–6 chạy.

Lý do theo cost-of-error: một lời giảng bịa hoặc gán sai trang có thể làm học viên học sai, còn một lần dừng để cảnh báo/duyệt outline tốn ít hơn và có thể sửa. Vì vậy không chọn “automate hoàn toàn”.

### §4b. Nguyên tắc HAX/PAIR đã áp dụng


| Nguyên tắc                               | Áp cụ thể vào đâu trong prototype                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 — Làm rõ hệ thống làm được gì | UI/README giới hạn PDF 50 MB, 80 trang và chỉ cam kết`FULL`; không hứa đọc chính xác mọi scan/bố cục bất thường.                   |
| G2 — Làm rõ nó làm tốt đến đâu   | Outline review hiện warning/unreadable page, coverage và source; kết quả có coverage report thay vì nói “đã hiểu toàn bộ”.            |
| G10 — Thu hẹp phạm vi khi nghi ngờ     | Module 1 giữ warning cho nội dung không chắc; Module 3 chặn grounded claim thiếu source; Module 4 fallback visual an toàn.                   |
| G8 — Gạt bỏ dễ dàng                   | User có thể cancel/retry job; outline được duyệt trước khi tốn chi phí sinh video và không buộc phải nhận video đã tạo.           |
| G9 — Sửa dễ dàng                       | Màn outline cho sửa title, objective, thứ tự và mức chi tiết chapter; plan gốc được giữ lại trước khi resume pipeline.               |
| G11 — Giải thích vì sao                | Mỗi claim quan trọng trace về`source_id`, chapter có link về trang nguồn, và warning/coverage chỉ ra phần nào không nên tin mù quáng. |

## §5. Kiểu lỗi — 4 lớp chỗ khó và kịch bản rủi ro


| ID  | Lớp                         | Tình huống cụ thể                                                            | Hành vi mong muốn                                                                                                                      | Nguyên tắc |
| --- | ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R1  | ① Nguồn sự thật          | Script có grounded claim nhưng không có`source_id`                           | Chặn artifact, chỉ repair chapter lỗi; không cho claim đi tiếp                                                                     | G10, G11     |
| R2  | ① Nguồn sự thật          | Claim cite đúng trang nhưng nhầm element/chapter                             | Semantic/grounding validator đánh lỗi; retry scoped chapter, lưu trace                                                               | G2, G10      |
| R3  | ② Mơ hồ/thiếu thông tin | Trang có chữ/ảnh khó đọc                                                   | Gắn warning và cho user xem trang/thumbnail; không biến đoạn đó thành fact chắc chắn                                          | G2, G10      |
| R4  | ② Mơ hồ/thiếu thông tin | Cần`CROP_AND_HIGHLIGHT` nhưng không có bounding box                          | Hạ về`ORIGINAL_PAGE`, ghi warning thay vì bịa tọa độ                                                                              | G10, G11     |
| R5  | ③ Ngoài phạm vi           | User upload file không phải PDF hoặc không có PDF magic bytes               | Từ chối upload với lỗi rõ; không chạy pipeline                                                                                    | G1, G10      |
| R6  | ③ Ngoài phạm vi           | PDF vượt 80 trang/50 MB hoặc mã hóa                                         | Từ chối trước khi gọi model; gợi ý chia nhỏ/đổi file. PDF mã hóa hiện chưa có fixture automated nên giữ là rủi ro mở | G1, G10      |
| R7  | ④ Đặc thù domain         | Script dài/estimate lệch khiến video không khớp bài                        | Timeline lấy duration WAV thật; ghi warning khi estimate lệch lớn. Run representative ghi nhận lệch tổng -44,8%                   | G2, G11      |
| R8  | ④ Đặc thù domain         | Text/visual quá dày hoặc contrast kém làm người học không đọc được | Layout QA cảnh báo, fixed theme/safe area; fallback visual khi cần                                                                    | G2, G8       |
| R9  | ① Nguồn sự thật          | PDF chứa instruction đánh lạc hướng model                                  | Coi PDF là data, không làm theo instruction trong PDF; cần adversarial fixture trước CP6                                           | G10          |
| R10 | ④ Đặc thù domain         | TTS lỗi ở một scene                                                           | Retry tối đa ba lần; nếu cuối cùng vẫn lỗi thì ghi status/fallback, không âm thầm báo video hoàn hảo                      | G2, G11      |

## §6. Bốn đường đi của trải nghiệm


| Đường đi            | Trigger                                                      | User thấy/gặp                                                        | Kết quả kiểm được                                      |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Happy path              | PDF có cấu trúc rõ, trong giới hạn                     | Upload → review outline → approve → video/chapter/SRT/coverage      | PDF representative: 45/45 trang, 84/84 segment, MP4 playable |
| Low-confidence          | OCR/analysis đánh dấu trang/nguồn không chắc           | Warning, thumbnail, coverage; user xem/sửa outline trước khi render | Không biến warning thành grounded claim                   |
| Failure/không căn cứ | Thiếu source hoặc validator phát hiện claim/citation sai | Chặn/repair artifact liên quan, không cho completed output che lỗi | Validator/retry theo chapter và log kết quả               |
| Correction              | User thấy thứ tự/mục tiêu chưa phù hợp               | Sửa outline rồi approve; original plan còn lưu để đối chiếu   | Module 3–6 chạy từ plan đã duyệt                       |
| Đòi ngoài phạm vi   | Không phải PDF, vượt limit, file không hợp lệ         | Hệ thống nói rõ giới hạn và không chạy                        | API validation/error status                                  |
| Case domain             | Estimate voice lệch nhiều hoặc TTS lỗi                   | Timeline dùng audio thật; warning được giữ trong manifest/eval   | Không dùng estimate sai để quyết định duration video  |

## §7. Kiểm thử

### Chiều chất lượng và định nghĩa chấm


| Chiều                 | Pass khi                                                                                            | Cách kiểm                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Grounding/traceability | 100% grounded claim trong case có`source_id` hợp lệ và không cite sai element                  | Zod + Grounding Validator + semantic review; auditor mở source trace |
| Coverage               | FULL có 100% page/source được phân loại; warning vẫn hiện thay vì bị bỏ qua              | coverage manifest và report                                          |
| Media integrity        | Không có scene`FAILED`; MP4 có H.264/AAC, audio; SRT monotonic; timestamp nằm trong duration    | manifest, FFprobe, subtitle validator                                 |
| UX safety              | File ngoài phạm vi bị chặn rõ; user duyệt outline trước khi sinh video                      | API test + browser E2E                                                |
| Learning usability     | Một người ngoài nhóm tìm đúng chapter/trang và nêu được chỗ không tin/khó theo dõi | CP5 quan sát task 10 phút; hiện**chưa đo**, không claim pass    |

### Golden set và quality bar

- Golden set v1 gồm 20 case, đúng cơ cấu 8 case thường + 8 case thuộc 4 lớp chỗ khó + 4 case hiếm. Mười case được neo về mã hội thoại thật nhưng không sao chép data pack: [`eval/golden-set-v1.md`](eval/golden-set-v1.md).
- **Quality bar đã chốt:** đạt khi **≥90% (18/20) case pass**, mọi case P0 đã được chạy, **0** grounded claim thiếu/sai `source_id` trong output COMPLETED, **0** video COMPLETED có scene `FAILED`, và mọi warning/fail còn lại được giữ nguyên trong report.
- Lượt đo đầu: [`eval/run-01-2026-07-30.md`](eval/run-01-2026-07-30.md). Kết quả hiện tại **17/20 pass = 85,0%**, 1 fail (duration estimate) và 2 not-run (PDF mã hóa, prompt injection). Vì vậy **chưa đạt quality bar**; không đổi bar theo kết quả này.

### Kế hoạch lặp trước CP5/CP6

1. Viết encrypted/corrupt PDF fixture và adversarial prompt-injection fixture; chạy lại toàn bộ 20 case.
2. Sửa/hiệu chỉnh duration estimator dựa trên audio thực, rồi chạy lại trọn bộ để kiểm regression.
3. Thêm 4 golden PDF đã được phép dùng, không chỉ PDF representative.
4. User-test tối thiểu 5 người ngoài nhóm; thực hiện ít nhất một thay đổi từ feedback và cập nhật changelog.

## §8. Phân công & kế hoạch

### Phân công

Repo hiện không có danh sách thành viên/mã học viên; **không tự điền tên để tránh bịa thông tin cá nhân.** Trước khi nộp, nhóm phải thay các ô dưới đây bằng tên thật trong `README.md` và giữ một người chịu trách nhiệm mỗi artifact.


| Vai trò         | Người phụ trách     | Artifact/đầu ra                                  |
| ---------------- | ----------------------- | -------------------------------------------------- |
| Spec + evidence  | `Phạm Đình Minh`     | `spec.md`, `evidence/mining-log.md`                |
| Eval/prompt      | `Đồng Đại Huy`      | `eval/golden-set-v1.md`, run log, failure analysis |
| Backend/pipeline | `Nguyễn Đình Bình`  | `codebase/src/`, contract/validator                |
| Web/demo         | `Nguyễn Quang Tường` | `codebase/frontend/`, dry run                      |
| Validation       | `Phạm Đức Trung`     | `validation/feedback-log.md` tại CP5              |

### Willing users và validation CP5

Chưa có 3 user có tên trong repo, nên đây là **blocker không thể thay bằng tên giả**. Trước CP5, mời tối thiểu 5 người ngoài nhóm (ưu tiên 3 người đã từng cần catch-up) và ghi consent/names or role theo chính sách lớp.

Task 10 phút: “Hãy dùng PDF này để tìm lại phần bạn cần học trước buổi tiếp theo; nói to bạn đang kỳ vọng gì.” Người quan sát không hướng dẫn. Hỏi ba câu: (1) khó hiểu/khó chịu nhất là gì, (2) bạn tin kết quả đến đâu và vì sao, (3) bạn có dùng lại không và trong tình huống nào. Log quote nguyên văn, thao tác, mức nghiêm trọng và thay đổi quyết định làm/không làm.

### Multi-prototype

Đã cân nhắc hai trục: **summary văn bản ngắn** vs **video có chapter/subtitle/source trace**. Chọn video để test liệu lời giảng theo mạch giúp catch-up hơn summary tĩnh; không khẳng định thắng trước user test. Nếu CP5 cho thấy user chỉ cần tìm nhanh, quay lại summary/chapter map thay vì thêm tính năng vào video.

## §9. Changelog


| Thời điểm            | Đổi gì                                                                                     | Vì sao / bằng chứng                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2026-07-30              | Khởi tạo spec CP4, neo pain vào mining log thay vì nói chung “người học cần video” | `evidence/mining-log.md`; 141 lượt có từ khóa tổng hợp và 49 refusal theo rule |
| 2026-07-30              | Chốt quality bar 90%, thêm 20-case golden set và run log                                   | `eval/golden-set-v1.md`, `eval/run-01-2026-07-30.md`                                   |
| 2026-07-30              | Giữ duration estimate lệch -44,8% là fail, không sửa số liệu                           | `ai-lecture-video/eval/module5b-lecture-02.md`                                         |
| CP5 (chưa thực hiện) | Cập nhật sau user validation và rerun toàn bộ set                                        | Không được thay quality bar; chỉ bổ sung evidence/kết quả                      |
