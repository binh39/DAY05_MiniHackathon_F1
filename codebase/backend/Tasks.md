# Tasks — AI Lecture Video

## 1. Mục tiêu sản phẩm

Xây dựng ứng dụng cho phép người dùng upload một PDF/slide, chọn cấu hình bài
giảng và nhận lại video giảng giải nội dung có:

- chapter và timestamp;
- lời giảng tự nhiên;
- visual bám theo tài liệu gốc;
- voice và subtitle đồng bộ;
- truy vết từng nội dung quan trọng về nguồn;
- báo cáo coverage và cảnh báo phần không đọc chắc chắn.

### Lời hứa của MVP

> Với một PDF bài giảng có cấu trúc rõ ràng, tối đa 80 trang, hệ thống tạo được
> video tiếng Việt theo chế độ Full Lecture, có chapter, subtitle và báo cáo
> trang nào đã được xử lý.

### Ngoài phạm vi MVP

- PDF trên 80 trang.
- Chữ viết tay.
- Avatar người giảng.
- Generative video.
- Dựng lại công thức hoặc biểu đồ phức tạp bằng Manim.
- Nhiều người cùng sửa một project.
- Streaming video khi pipeline chưa chạy xong.
- Cam kết xử lý chính xác mọi loại PDF scan hoặc bố cục bất thường.

---

## 2. Definition of Done chung

Một task chỉ được đánh dấu hoàn thành khi:

1. Code đã được tích hợp vào pipeline chính.
2. Input/output tuân thủ contract Zod.
3. Có ít nhất một test cho happy path.
4. Có test hoặc hành vi rõ cho failure quan trọng.
5. Không chứa API key hoặc dữ liệu nhạy cảm trong repo.
6. README hoặc tài liệu liên quan đã cập nhật.
7. `npm run typecheck` và `npm test` đều đạt.

Một module chỉ được coi là hoàn thành khi chạy được bằng dữ liệu thật, không
dùng artifact hard-code để giả lập output.

---

## 3. Thứ tự ưu tiên

- **P0:** bắt buộc để demo end-to-end.
- **P1:** cần để MVP đáng tin và có thể user test.
- **P2:** cải tiến sau khi MVP đã chạy ổn định.

Đường găng:

```text
Foundation
  → Module 1
  → Module 2
  → Module 3
  → Module 4
  → Module 5A + Module 5B
  → Module 6
  → Web UI
  → Evaluation + User Validation
```

Module 5A và 5B có thể phát triển song song sau khi contract storyboard ổn định.

---

## Phase 0 — Chốt product contract và bộ dữ liệu kiểm thử

### T0.1 — Chốt phạm vi PDF của MVP `[P0]`

- Chấp nhận `.pdf`.
- Giới hạn dung lượng và số trang.
- Chốt cách xử lý PDF có password, PDF hỏng và PDF scan.
- Chốt ngôn ngữ đầu vào; MVP ưu tiên Việt/Anh.
- Chốt output video MP4, subtitle SRT và coverage report JSON/HTML.

**Acceptance criteria**

- Giới hạn được ghi trong UI và README.
- File ngoài phạm vi bị từ chối với thông báo có hướng dẫn.

### T0.2 — Chốt ba chế độ coverage `[P0]`

- `FULL`: bao phủ tối đa nội dung có ý nghĩa trong duration contract đã chọn.
- `CONCISE`: giữ ý chính, rút ngắn ví dụ phụ.
- `SUMMARY`: chỉ trình bày insight và kết luận.
- Web app ánh xạ option ngắn sang `SUMMARY`/`CONCISE` và option 8–10 phút sang
  `FULL`.

**Acceptance criteria**

- `target_duration` là ngân sách bắt buộc. Nội dung không thể dạy an toàn trong
  ngân sách phải được đánh dấu `OUT_OF_SCOPE`, không nhồi hoặc cắt ngang video.
- Mỗi nội dung đều có treatment và lý do xử lý.

### T0.3 — Chuẩn bị golden document set `[P0]`

Chuẩn bị tối thiểu 5 PDF không chứa dữ liệu nhạy cảm:

1. Slide text đơn giản.
2. Slide có diagram.
3. Slide có bảng.
4. Slide có code hoặc công thức.
5. PDF lỗi/scan để kiểm tra failure.

Với mỗi PDF, ghi:

- section/page kỳ vọng;
- concept chính;
- trang bắt buộc phải được cover;
- element khó;
- thời lượng video hợp lý;
- các claim không được phép nói sai.

**Acceptance criteria**

- Golden set có thể dùng lại cho Module 1–6.
- Ít nhất một người khác trong nhóm có thể kiểm lại expected result.

---

## Phase 1 — Nền tảng kỹ thuật

### T1.1 — Hoàn thiện project skeleton `[P0]`

- TypeScript strict mode.
- Contract Zod.
- Pipeline runner.
- Artifact store.
- CLI `inspect` và `run`.
- Module 5A/5B chạy song song.

**Trạng thái:** Pipeline thật chạy end-to-end qua Module 1–6, phát structured
module event và tạo MP4, SRT cùng coverage report. Job metadata lưu trạng thái,
thời gian và lỗi riêng cho 1, 2, 3, 4, 5A, 5B và 6.

### T1.2 — Run manifest và trạng thái job `[P0]`

Tạo manifest cho mỗi lần chạy:

```text
CREATED
→ ANALYZING_DOCUMENT
→ PLANNING_LECTURE
→ GENERATING_SCRIPT
→ GENERATING_STORYBOARD
→ GENERATING_ASSETS
→ COMPOSING_VIDEO
→ COMPLETED / FAILED / CANCELLED
```

Manifest cần lưu:

- `run_id`;
- config;
- module hiện tại;
- thời gian bắt đầu/kết thúc;
- artifact đã tạo;
- lỗi và warning;
- version model/prompt/schema.

**Acceptance criteria**

- UI/CLI đọc được trạng thái mà không phải parse console log.
- Một run thất bại ghi rõ module và nguyên nhân.

### T1.3 — Resume, cache và idempotency `[P1]`

- Hash input PDF và config.
- Cho phép chạy lại từ module bị lỗi.
- Không gọi lại AI/TTS nếu artifact hợp lệ đã tồn tại.
- Module 5A/5B có thể retry độc lập.

**Acceptance criteria**

- Module 6 fail không làm chạy lại Gemini/TTS.
- Rerun cùng input không ghi đè artifact của run khác.

### T1.4 — Logging và error taxonomy `[P0]`

Phân biệt:

- invalid input;
- provider authentication;
- rate limit;
- provider timeout;
- schema validation;
- low-confidence extraction;
- render failure;
- unsupported content;
- internal error.

**Acceptance criteria**

- Log không chứa API key hoặc toàn bộ nội dung PDF.
- Error hiển thị cho user khác với diagnostic dành cho developer.

---

## Phase 2 — `module1_document_intelligence`

### T2.1 — PDF ingestion và validation `[P0]`

- Kiểm tra MIME và magic bytes, không chỉ extension.
- Phát hiện file password-protected hoặc corrupt.
- Đếm trang và dung lượng.
- Copy input vào thư mục run với tên an toàn.
- Tạo checksum.

**Acceptance criteria**

- Không có path traversal.
- PDF không hợp lệ không được gửi tới Gemini.

### T2.2 — Render PDF thành page assets `[P0]`

- Render từng trang thành PNG/JPEG.
- Lưu kích thước và đường dẫn asset.
- Giữ mapping tuyệt đối `page → image`.
- Tạo thumbnail cho preview.

**Acceptance criteria**

- Mọi trang có asset hoặc warning rõ.
- Số trang render khớp PDF.

### T2.3 — Gemini multimodal adapter `[P0]`

- Interface provider tách khỏi module.
- Gửi PDF/page theo batch phù hợp context limit.
- Structured output theo `documentSchema`.
- Retry có giới hạn với lỗi transient.
- Lưu model name, prompt version và usage metadata.

**Acceptance criteria**

- Chạy được trên ít nhất 3 golden PDF.
- Response sai schema được phát hiện và sửa/retry có kiểm soát.

### T2.4 — Source Registry cấp element `[P0]`

Mỗi source cần:

- `source_id`;
- page;
- element type;
- excerpt/description;
- bounding box nếu có;
- confidence;
- asset reference.

**Acceptance criteria**

- Có thể highlight đúng element trên ít nhất PDF text và diagram.
- ID ổn định trong toàn bộ một run.

### T2.5 — Nhận diện cấu trúc tài liệu `[P0]`

- Title.
- Section/chapter.
- Heading hierarchy.
- Concept.
- Page summary.
- Reading order.
- Duplicate/reference/appendix.

**Acceptance criteria**

- Section coverage đạt quality bar trên golden set.
- Không tạo section không có source.

### T2.6 — Low-confidence và unsupported content `[P1]`

- Đánh dấu scan/OCR kém.
- Đánh dấu formula/chart không đọc chắc chắn.
- Không tự diễn giải element dưới ngưỡng confidence.

**Acceptance criteria**

- Failure được đưa vào `warnings`, không bị che giấu.
- Module sau có thể chọn `SHOW` hoặc `UNREADABLE`.

### T2.7 — Test Module 1 `[P0]`

- Unit test schema/mapping.
- Integration test một PDF nhỏ.
- Failure test PDF hỏng.
- Golden evaluation cho page/section/source extraction.

---

## Phase 3 — `module2_lecture_planner`

**Trạng thái: core backend hoàn thành cho chế độ `FULL`.** Đã chạy representative
evaluation với `Lecture-02-Process.pdf` 45 trang; kết quả nằm tại
`eval/module2-lecture-02.md`. UI duyệt/chỉnh outline đã hoàn thành; chưa đạt
golden evaluation vì chưa chạy đủ bộ 5 golden PDF.

### T3.1 — Chapter segmentation `[P0]`

- Nhóm section thành chapter.
- Giữ prerequisite trước concept phụ thuộc.
- Giới hạn mỗi chapter theo `max_chapter_minutes`.
- Không cắt một concept giữa hai chapter nếu tránh được.

### T3.2 — Content treatment decision `[P0]`

Mỗi item nhận một treatment:

- `EXPLAIN`
- `MENTION`
- `SHOW`
- `REFERENCE`
- `UNREADABLE`
- `DUPLICATE`

Mỗi quyết định phải có reason và source.

**Acceptance criteria**

- Không có source bị bỏ âm thầm.
- Full mode không dùng `SKIP`.

### T3.3 — Duration estimator `[P0]`

- Ước lượng theo số từ.
- Thêm thời gian xem diagram, table và formula.
- Giới hạn tốc độ đọc.
- Trả tổng thời lượng và thời lượng từng chapter.

**Acceptance criteria**

- Sai lệch giữa estimate và voice thật được ghi để hiệu chỉnh.

### T3.4 — Coverage Validator `[P0]`

- Đối chiếu toàn bộ page/source với lecture plan.
- Phát hiện page/source chưa được xử lý.
- Phát hiện item không có nguồn.
- Tính coverage rate theo page và source.

**Acceptance criteria**

- 100% page có trạng thái.
- Full mode không pass nếu còn page chưa phân loại.

### T3.5 — Outline review artifact `[P1]`

- Sinh outline có chapter, thời lượng, treatment và warning.
- Cho phép user duyệt trước khi sinh script.

### T3.6 — Test Module 2 `[P0]`

- Full mode.
- Tài liệu dài phải chia chapter.
- Duplicate/reference.
- Unreadable page.
- Coverage validator fail.

---

## Phase 4 — `module3_script_generator`

**Trạng thái: core backend hoàn thành.** Đã sinh và semantic-review script thực
tế cho `Lecture-02-Process.pdf`; kết quả đánh giá nằm tại
`eval/module3-lecture-02.md`. Chưa hoàn thành toàn Phase vì pause metadata phụ
thuộc Module 4–5B và chưa chạy đủ golden set.

### T4.1 — Script prompt và provider adapter `[P0]`

- Sinh theo từng chapter.
- Chỉ truyền source cần thiết.
- Giữ glossary/thuật ngữ nhất quán.
- Không đọc lại bullet nguyên văn nếu không cần.

### T4.2 — Phân loại narration `[P0]`

- `GROUNDED_CLAIM`
- `TEACHING_ANALOGY`
- `EXAMPLE`
- `TRANSITION`
- `LEARNING_CHECK`

**Acceptance criteria**

- Grounded claim bắt buộc có `source_ids`.
- Transition không bị ép citation giả.
- Analogy/example không được trình bày như fact từ tài liệu.

### T4.3 — Grounding Validator `[P0]`

- Kiểm tra claim có được source hỗ trợ không.
- Phát hiện cite đúng trang nhưng sai element.
- Phát hiện mâu thuẫn với tài liệu.
- Retry phần fail thay vì sinh lại toàn script.

### T4.4 — Learning objective coverage `[P1]`

- Mỗi objective được ít nhất một narration xử lý.
- Phát hiện objective bị thiếu.
- Có summary cuối chapter.

### T4.5 — Pronunciation glossary `[P1]`

- Thuật ngữ tiếng Anh.
- Acronym.
- Tên model/công nghệ.
- Từ cần giữ nguyên hoặc đọc theo tiếng Việt.

### T4.6 — Pacing và chunking `[P0]`

- Giới hạn narration mỗi scene.
- Chèn pause hợp lý.
- Không cắt câu giữa hai scene.
- Ước lượng thời lượng từng narration.

### T4.7 — Test Module 3 `[P0]`

- Grounded fact.
- Analogy.
- Source conflict.
- Missing source.
- Thuật ngữ kỹ thuật.
- Chapter quá dài.

---

## Phase 5 — `module4_storyboard_generator`

**Trạng thái: core backend hoàn thành.** Đã tạo 84/84 scene cho
`Lecture-02-Process.pdf`, validator không còn missing/duplicate/invalid source và
duration delta bằng 0. Kết quả đánh giá nằm tại `eval/module4-lecture-02.md`.
Chưa đạt golden evaluation; crop/highlight thật còn phụ thuộc bounding box từ
Module 1.

### T5.1 — Template registry `[P0]`

MVP hỗ trợ:

- `TITLE`
- `ORIGINAL_PAGE`
- `CROP_AND_HIGHLIGHT`
- `BULLET`
- `DIAGRAM`
- `SUMMARY`

Mỗi template định nghĩa props hợp lệ bằng schema.

### T5.2 — Scene routing `[P0]`

- Ưu tiên original page/source asset.
- Crop/highlight khi narration nói về một element cụ thể.
- Dùng diagram mới chỉ khi quan hệ được mô tả có cấu trúc.
- Không cho LLM sinh animation code.

### T5.3 — Asset preparation plan `[P0]`

- Xác định source image/crop.
- Xác định text overlay.
- Xác định highlight sequence.
- Xác định fallback nếu source asset lỗi.

### T5.4 — Storyboard Validator `[P0]`

- Mọi narration có scene.
- Scene có template hợp lệ.
- Visual quan trọng có source.
- Không tham chiếu source ID không tồn tại.
- Tổng scene duration khớp script estimate.

### T5.5 — Test Module 4 `[P0]`

- Original page.
- Crop/highlight.
- Diagram fallback.
- Unsupported props.
- Missing source.

---

## Phase 6A — `module5a_visual_generator`

**Trạng thái: core renderer hoàn thành.** Remotion `4.0.501` đã render 84/84
scene của `Lecture-02-Process.pdf` thành PNG 1920×1080, toàn bộ checksum và kích
thước hợp lệ. Crop/highlight có smoke fixture riêng. Kết quả đánh giá nằm tại
`eval/module5a-lecture-02.md`. Chưa đạt golden evaluation.

### T6A.1 — Khởi tạo Remotion project `[P0]`

- Composition chính.
- Scene dispatcher.
- Shared theme, font và color tokens.
- 16:9 Full HD.

### T6A.2 — Implement template MVP `[P0]`

- Title.
- Original page.
- Crop and highlight.
- Bullet.
- Diagram.
- Summary.

### T6A.3 — PDF asset renderer `[P0]`

- Render page đúng tỷ lệ.
- Crop theo bounding box.
- Highlight không che nội dung.
- Hỗ trợ zoom/pan deterministic.

### T6A.4 — Layout QA `[P1]`

- Text overflow.
- Safe area.
- Contrast.
- Font missing.
- Image low resolution.

### T6A.5 — Visual manifest `[P0]`

- Asset path.
- Resolution.
- Render status.
- Warning.
- Scene mapping.

### T6A.6 — Test Module 5A `[P0]`

- Snapshot/template test.
- Render smoke test.
- Overflow/fallback case.

---

## Phase 6B — `module5b_voice_generator`

**Trạng thái: core backend hoàn thành.** Google Cloud Text-to-Speech đã sinh và
validate 84/84 scene của `Lecture-02-Process.pdf` bằng voice
`vi-VN-Neural2-A`. Có SSML glossary/pause, retry, silent fallback, WAV probing,
checksum và cache từng scene. Kết quả nằm tại `eval/module5b-lecture-02.md`.
Chưa hoàn thành toàn Phase vì chưa chạy đủ golden set và chưa có human listening
evaluation.

### T6B.1 — TTS provider interface `[P0]`

- Adapter chung.
- MVP chọn một provider ổn định.
- Cho phép thay Edge/Gemini/ElevenLabs mà không sửa pipeline.

### T6B.2 — Audio generation theo scene `[P0]`

- Một file audio mỗi scene.
- Retry độc lập.
- Cache theo hash text + voice config.
- Chuẩn hóa sample rate/format.

### T6B.3 — Duration probing `[P0]`

- Đọc duration thật từ audio.
- Cập nhật voice manifest.
- Cảnh báo scene quá dài/ngắn.

### T6B.4 — Pronunciation và pause `[P1]`

- Dùng glossary từ Module 3.
- Chuẩn hóa acronym.
- Chèn pause.
- Tránh TTS đọc citation/source ID.

### T6B.5 — Test Module 5B `[P0]`

- Tạo audio thật.
- Provider timeout.
- Cache hit.
- Duration hợp lệ.
- Ký tự hoặc thuật ngữ khó.

---

## Phase 7 — `module6_video_composer`

**Trạng thái: core MVP hoàn thành.** Pipeline đã tạo video thật từ
`Lecture-02-Process.pdf`: 84 scene, H.264/AAC 1920×1080 30 fps, SRT, 8 chapter
timestamp và coverage report. Render từng scene có cache/resume và final FFprobe
QA. Kết quả tại `eval/module6-lecture-02.md`. Chưa hoàn thành animation nội cảnh,
human watch/listening evaluation và golden set.

### T7.1 — Đồng bộ audio và scene `[P0]`

- Duration visual lấy theo audio thật.
- Điều chỉnh animation theo scene duration.
- Không cắt voice.
- Thêm khoảng nghỉ giữa chapter.

### T7.2 — Subtitle `[P0]`

- Sinh SRT/VTT.
- Chia subtitle theo câu/cụm dễ đọc.
- Đồng bộ timestamp.
- Không tràn quá nhiều chữ một khung.

### T7.3 — Chapter timestamp `[P0]`

- Title chapter.
- Start time.
- Danh sách timestamp xuất kèm video.

### T7.4 — Render và concatenate `[P0]`

- Remotion render từng chapter hoặc segment.
- FFmpeg ghép thành MP4.
- Cho phép resume khi một chapter render lỗi.
- Chuẩn hóa codec và audio.

### T7.5 — Coverage report `[P0]`

Báo cáo:

- covered page/source;
- reference;
- duplicate;
- unreadable;
- warning;
- coverage rate;
- mapping chapter → source.

### T7.6 — Final QA `[P0]`

- Video mở được.
- Có audio.
- Duration hợp lệ.
- Subtitle tồn tại.
- Chapter timestamp tăng đúng.
- Không có scene `FAILED`.
- Không có ungrounded claim chưa xử lý.

### T7.7 — Test Module 6 `[P0]`

- Video ngắn end-to-end.
- Một scene warning.
- Audio/visual mismatch.
- Resume chapter render.

---

## Phase 8 — Backend job service

**Trạng thái: core local backend hoàn thành.** API đã nhận PDF, tạo và lưu job,
chạy pipeline nền với concurrency 1, trả progress, hỗ trợ cancel/retry và chỉ
serve bốn loại artifact cho phép. Đã test end-to-end từ frontend tới video thật.
Firebase Auth đã bảo vệ API; job có owner và được mirror sang Firestore, còn PDF
và artifact được mirror sang Storage tại `asia-southeast1`. Pipeline hiện dừng
sau Module 2 ở `AWAITING_APPROVAL`; user có thể xem document analysis, sửa
title/objective/thứ tự/mức chi tiết chapter rồi approve để tiếp tục Module 3–6
trong cùng run. Mỗi module có timeout riêng; khi lỗi, retry giữ nguyên run và
bắt đầu lại đúng module, kể cả retry độc lập nhánh 5A/5B.

### T8.1 — API upload và tạo job `[P0]`

- Upload PDF.
- Validate input.
- Tạo `run_id`.
- Lưu config.
- Trả job status URL.

### T8.2 — Job runner `[P0]`

- Chạy pipeline ngoài request HTTP.
- Giới hạn concurrency.
- Timeout từng module.
- Retry có kiểm soát.
- Cancel job.

### T8.3 — Job status API `[P0]`

- State hiện tại.
- Progress theo module.
- Warning.
- Error.
- Artifact/result URLs.

### T8.4 — Outline approval `[P1]`

- Pipeline dừng sau Module 2.
- User duyệt hoặc chỉnh title/chapter/treatment.
- Tiếp tục từ Module 3.

### T8.5 — Artifact serving `[P0]`

- Video.
- Subtitle.
- Coverage report.
- Thumbnail.
- Không public toàn bộ run directory.

---

## Phase 9 — Web app

**Trạng thái: luồng P0, outline review, result navigation và feedback đã nối backend thật.** Người dùng có thể upload
PDF, chọn tỉ lệ/thời lượng/ngôn ngữ/voice, theo dõi trạng thái, cancel/retry, xem
video và tải MP4/SRT. Đăng nhập, đăng ký, giữ phiên và reset password đã dùng
Firebase Authentication thật. Upload hiển thị byte progress thật; processing card
hiển thị trạng thái từng module và 5A/5B song song. Result player đã có chapter navigation theo timestamp,
coverage summary, đối chiếu trang nguồn PDF và form feedback lưu thật theo user/job.
UI không còn seed/mock document hoặc video.

### T9.1 — Upload screen `[P0]`

- Drag/drop PDF.
- Hiển thị giới hạn.
- Coverage mode.
- Audience/language.
- Voice.
- Upload progress.

### T9.2 — Document analysis preview `[P1]`

- Số trang.
- Chapter phát hiện.
- Thời lượng dự kiến.
- Trang unreadable/warning.

### T9.3 — Outline review `[P1]`

- Chapter list.
- Treatment.
- Source page.
- Cho phép approve.

### T9.4 — Processing screen `[P0]`

- Progress theo module.
- Module 5A/5B hiển thị song song.
- Không hiển thị phần trăm giả.
- Error có hành động retry phù hợp.

### T9.5 — Result screen `[P0]`

- Video player.
- Chapter navigation.
- Download MP4/SRT.
- Coverage summary.
- Warning.
- Link tới source page theo chapter.

### T9.6 — Feedback `[P1]`

- Video có đúng nội dung không?
- Phần nào khó hiểu/sai?
- Thời lượng phù hợp không?
- User có dùng thay việc đọc PDF không?

---

## Phase 10 — Evaluation và validation

### T10.1 — Technical quality metrics `[P0]`

- Schema pass rate.
- Page/source coverage.
- Grounded claim rate.
- Unsupported claim count.
- Render success rate.
- Audio/visual sync error.
- Duration estimate error.
- End-to-end latency.
- Chi phí mỗi trang/phút video.

### T10.2 — Golden set evaluation `[P0]`

- Chạy toàn bộ golden PDF.
- Không bỏ case fail.
- Lưu input ID, output, score và nguyên nhân lỗi.
- So sánh với quality bar đã chốt.

### T10.3 — Learning evaluation `[P1]`

So sánh:

- nhóm đọc PDF trong cùng thời lượng;
- nhóm xem video.

Đo:

- câu hỏi hiểu nội dung;
- khả năng tìm lại nguồn;
- thời gian hoàn thành;
- mức tự tin không được dùng thay điểm hiểu bài.

### T10.4 — User validation `[P0]`

- Ít nhất 5 người ngoài nhóm.
- Mỗi người dùng một PDF thật phù hợp chính sách dữ liệu.
- Ghi quote nguyên văn, lỗi và hành vi.
- Ít nhất một thay đổi sản phẩm từ feedback.

---

## Phase 11 — Security, privacy và vận hành

### T11.1 — Secret management `[P0]`

- API key chỉ trong environment.
- Không log secret.
- `.env` không commit.

### T11.2 — File security `[P0]`

- MIME/magic-byte validation.
- Safe filename.
- Size/page limit.
- Không thực thi content nhúng trong PDF.
- Chống path traversal.

### T11.3 — Prompt injection trong tài liệu `[P1]`

- Nội dung PDF luôn là dữ liệu, không phải system instruction.
- Không cho PDF thay đổi tool/config/policy.
- Validator phát hiện output ngoài schema/phạm vi.

### T11.4 — Retention và deletion `[P1]`

- Chính sách giữ PDF/video.
- User có thể xóa job.
- Xóa cả artifact trung gian.
- Không dùng tài liệu để huấn luyện ngoài cam kết provider.

**Đã hoàn thiện:** `DELETE /api/jobs/:id` kiểm tra owner, không cho xóa job
`QUEUED/RUNNING`, xóa PDF, run directory, metadata, Firestore document và toàn
bộ Storage prefix của job. Retention chạy khi backend khởi động, chỉ áp dụng cho
job terminal và được bật bằng `JOB_RETENTION_DAYS`.

### T11.5 — Cost và quota `[P1]`

- Giới hạn số trang.
- Ước tính chi phí trước khi chạy.
- Theo dõi token/TTS/render.
- Rate limit theo user.

**Đã hoàn thiện guardrail MVP:** `GET /api/quota` và kiểm tra trước khi tạo job
theo user cho số job active, số job lưu, dung lượng và phút video theo tháng.
Thời lượng tối đa của option được reserve khi job được tạo; giới hạn cấu hình
bằng các biến `USER_MAX_*` và `USER_MONTHLY_VIDEO_MINUTES`.

---

## Phase 12 — Deployment và demo readiness

### T12.1 — Environment check `[P0]`

- Node.js.
- FFmpeg.
- Font tiếng Việt.
- Remotion/Chromium dependencies.
- API credentials.

### T12.2 — Container/build reproducibility `[P1]`

- Một lệnh setup.
- Lockfile.
- Version FFmpeg/font/model được ghi.

### T12.3 — Demo fixture `[P0]`

- Một PDF demo đã được phép sử dụng.
- Có expected outline.
- Có golden claims.
- Có case warning để chứng minh failure handling.

### T12.4 — Demo flow `[P0]`

1. Upload PDF.
2. Xem cấu trúc và thời lượng dự kiến.
3. Approve outline.
4. Theo dõi pipeline.
5. Xem video.
6. Nhảy chapter.
7. Mở coverage report/source.
8. Trình bày một failure an toàn.

---

## 3.13. Thư viện tài liệu và Module 7 — Hoàn thành

- Upload PDF độc lập và lưu ngay khi chọn file ở trang Tạo video mới.
- Phân tích tài liệu một lần bằng Module 1 trước khi cho phép tạo video hoặc tóm tắt.
- Tạo video từ PDF trong thư viện, giữ nguyên các tùy chọn thời lượng, ngôn ngữ, giọng đọc và phong cách.
- Sinh structured summary từ artifact Module 1, lưu cache và hiển thị cạnh trình đọc PDF.
- Bảo vệ file PDF/tóm tắt theo Firebase user.
- Có integration test cho PDF, summary và tiếp tục pipeline từ Module 2.

## 4. Milestone đề xuất

### Milestone 1 — PDF thành `document.json`

- Hoàn thành Phase 0–2.
- Module 1 chạy với một PDF thật.
- Source Registry và page assets kiểm được.

### Milestone 2 — PDF thành plan và script có căn cứ

- Hoàn thành Phase 3–4.
- Có coverage report sơ bộ.
- Grounded claim validator chạy được.

### Milestone 3 — Script thành storyboard, voice và visual

- Hoàn thành Phase 5–6.
- Render được từng scene.
- Voice duration thật điều khiển visual.

### Milestone 4 — Video end-to-end

- Hoàn thành Phase 7.
- Một PDF mẫu tạo được MP4, SRT và coverage report.

### Milestone 5 — App có người dùng thử

- Hoàn thành Phase 8–10.
- Upload qua UI, theo dõi job và xem kết quả.
- Có feedback log và thay đổi từ validation.

### Milestone 6 — An toàn và sẵn sàng demo

- Hoàn thành phần P0 của Phase 11–12.
- Chạy lại được trên máy demo từ đầu.
