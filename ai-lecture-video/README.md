# AI Lecture Video

Khung pipeline chuyển một PDF/slide thành video bài giảng có chapter, lời giảng,
visual, voice, subtitle và báo cáo coverage.

Phạm vi PDF hiện tại của MVP: tối đa 50 MB và 80 trang.

## Nguyên tắc kiến trúc

- Mỗi module có một nhiệm vụ và artifact JSON riêng.
- Mọi claim quan trọng phải trace về `source_id`, không chỉ số trang.
- Chế độ `FULL` tự ước tính thời lượng; `max_chapter_minutes` không phải giới
  hạn thời lượng của toàn video.
- `CONCISE` và `SUMMARY` đã có trong contract nhưng chưa được quality-test;
  luồng MVP hiện chỉ cam kết `FULL`.
- Module 5A và 5B chạy song song.
- Mỗi output được Zod kiểm tra trước khi chuyển sang module tiếp theo.
- Module 1–4 dùng Vertex AI qua Application Default Credentials. Module 5A dùng
  Remotion; Module 5B dùng Google Cloud Text-to-Speech qua ADC; Module 6 dùng
  FFmpeg/FFprobe đi kèm đúng phiên bản Remotion đã pin.

## Ngoài phạm vi MVP

- PDF trên 80 trang hoặc trên 50 MB.
- Chữ viết tay và PDF scan/bố cục bất thường cần độ chính xác tuyệt đối.
- Avatar người giảng hoặc generative video.
- Dựng lại công thức/biểu đồ phức tạp bằng Manim.
- Nhiều người cùng sửa một project hoặc streaming khi pipeline chưa hoàn tất.

## Cấu trúc

```text
src/
├── core/
│   ├── artifact-store.ts
│   ├── config.ts
│   ├── contracts.ts
│   └── module.ts
├── modules/
│   ├── module1_document_intelligence/
│   ├── module2_lecture_planner/
│   ├── module3_script_generator/
│   ├── module4_storyboard_generator/
│   ├── module5a_visual_generator/
│   ├── module5b_voice_generator/
│   └── module6_video_composer/
├── pipeline/
│   ├── pipeline-definition.ts
│   └── run-pipeline.ts
├── server/
│   ├── app.ts
│   ├── job-runner.ts
│   ├── job-store.ts
│   └── index.ts
└── cli.ts
```

## Artifact flow

```text
PDF
 ↓
01_document.json
 ↓
02_lecture_plan.json
 ↓
03_script.json
 ↓
04_storyboard.json
 ├───────────────┐
 ↓               ↓
05a_visual       05b_voice
 └───────┬───────┘
         ↓
06_video_manifest.json → lecture.mp4
```

## Chạy skeleton

```bash
npm install
npm run typecheck
npm run inspect
npm run smoke:vertex
npm run fixture:pdf
```

Chuẩn bị config:

```bash
copy config.example.json config.json
```

Sau khi các module đã được nối implementation:

```bash
npm run run -- config.json
```

Để thử nhanh Module 1 mà không dùng tài liệu thật:

```bash
npm run fixture:pdf
npm run run -- config.example.json
```

Lệnh `run` thực thi Module 1–4 bằng Vertex AI, sau đó chạy song song
Module 5A bằng Remotion và Module 5B bằng Google Cloud Text-to-Speech, ghi
`01_document.json`, `02_lecture_plan.json`, `03_script.json` và
`04_storyboard.json`, `05a_visual_manifest.json`, `05b_voice_manifest.json`.
Module 6 tiếp tục tạo `lecture.mp4`, `lecture.srt`, `coverage-report.json` và
`06_video_manifest.json`.

## Chạy backend API và frontend

Terminal thứ nhất, tại thư mục `ai-lecture-video`:

```bash
npm run serve:api
```

Terminal thứ hai:

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:4173`. API mặc định lắng nghe tại
`http://127.0.0.1:8787`. Job được lưu trong `backend-data/`; pipeline tiếp tục
ghi artifact vào `runs/`.

API hiện hỗ trợ upload/tạo job, danh sách và trạng thái job, cancel/retry, cùng
các artifact `video`, `subtitle`, `coverage`, `thumbnail`. File upload được giới
hạn 50 MB, kiểm tra MIME/đuôi file và PDF magic bytes. Artifact chỉ được đọc từ
run directory hợp lệ, không public toàn bộ filesystem.

Job tạo từ web chạy theo hai chặng:

```text
Upload → Module 1–2 → AWAITING_APPROVAL
                       ↓ user duyệt outline
                     Module 3–6 → COMPLETED
```

Trang duyệt outline hiển thị thumbnail, section, concept, warning, coverage,
chapter và thời lượng. User có thể đổi tiêu đề, mục tiêu học tập, thứ tự và mức
chi tiết chapter. Plan gốc được giữ tại `02_lecture_plan.original.json`; plan đã
duyệt được dùng khi resume từ Module 3.

## Firebase

Project hiện dùng `project-5d300c02-d165-4037-b6f`:

- Firebase Authentication bằng Email/Password;
- Firestore `(default)` tại `asia-southeast1`;
- Storage bucket
  `project-5d300c02-d165-4037-b6f.firebasestorage.app` tại
  `asia-southeast1`;
- rules trong `firestore.rules` và `storage.rules`.

Frontend giữ phiên bằng Firebase Auth và gửi ID token tới API. Backend xác minh
chữ ký token, chỉ trả job thuộc `owner_uid`, mirror metadata job lên Firestore
và file vào `users/{uid}/jobs/{jobId}/...` trên Storage. Deploy lại rules bằng:

```bash
npm run firebase:deploy
```

## Trách nhiệm từng module

### `module1_document_intelligence`

Đọc PDF bằng multimodal/OCR, phát hiện cấu trúc, page element, concept và tạo
Source Registry. Module hiện đã có:

- PDF magic-byte, encryption, dung lượng và page-limit validation;
- SHA-256 checksum;
- Vertex AI structured output với consistency validation và retry;
- cache analysis theo PDF/model/prompt/config;
- PNG đầy đủ và thumbnail cho từng trang, có cache;
- page/source/section traceability.

### `module2_lecture_planner`

Chia chapter, ước lượng thời lượng và quyết định `EXPLAIN`, `MENTION`, `SHOW`,
`REFERENCE`, `UNREADABLE` hoặc `DUPLICATE`. Module hiện đã có:

- Gemini structured output chỉ quyết định cấu trúc và treatment;
- duration estimator deterministic theo loại source và mức độ chi tiết;
- Coverage Manifest theo cả page và source;
- validator chặn source thiếu/trùng, sai thứ tự, code bị xử lý hời hợt và chapter quá dài;
- retry tối đa ba lần với phản hồi lỗi validator;
- cache theo document/model/prompt/config;
- evaluation thực tế trên giáo trình 45 trang.

### `module3_script_generator`

Sinh lời giảng tự nhiên theo chapter. Phân biệt grounded claim, analogy, example,
transition và learning check. Module hiện đã có:

- chỉ truyền page/source thuộc chapter đang viết;
- element-level citation cho mọi grounded claim;
- deterministic validator cho source, item, objective, chunk và duration;
- semantic review phát hiện unsupported claim, sai source và contradiction;
- chỉ sinh lại chapter chứa narration lỗi;
- pronunciation glossary có source traceability;
- cache theo document/plan/model/prompt/config.

### `module4_storyboard_generator`

Chuyển narration thành scene type nằm trong danh sách template cho phép và gắn
visual với đúng source asset. Module hiện đã có:

- registry Zod cho sáu template cố định;
- Gemini chỉ chọn route, không được sinh template props hoặc animation code;
- deterministic props, asset preparation plan và visual fallback;
- validator kiểm tra narration, source, props và duration;
- retry theo chapter và cache có rebase asset path sang run hiện tại.

### `module5a_visual_generator`

Render page gốc, crop/highlight và các template deterministic bằng
Remotion/React. Module hiện đã có:

- Remotion composition và dispatcher cho sáu template;
- theme 16:9 Full HD, font tiếng Việt, safe area và contrast cố định;
- deterministic zoom/highlight và crop projection theo image letterbox;
- layout QA, retry/fallback, checksum và visual manifest;
- cache từng scene không phụ thuộc `run_id`;
- smoke render và representative render 84 scene.

### `module5b_voice_generator`

Sinh audio từng scene bằng Google Cloud Text-to-Speech. Module hiện đã có:

- adapter Google TTS REST dùng Application Default Credentials và kiểm tra voice;
- SSML pronunciation glossary, XML escaping, pause theo narration kind và loại
  source ID/citation khỏi lời đọc;
- retry độc lập tối đa ba lần và silent WAV fallback có trạng thái `FAILED`;
- LINEAR16/WAV PCM mono 16-bit ở 24 kHz, duration probing và SHA-256;
- cache từng scene theo toàn bộ nội dung SSML và voice config;
- validator bảo đảm coverage 1:1 với storyboard và kiểm tra lại file audio;
- smoke audio thật và representative run 84 scene.

### `module6_video_composer`

Đồng bộ voice với visual, tạo subtitle, chapter timestamp, coverage report và
render video cuối. Module hiện đã có:

- timeline frame-aligned lấy duration thật từ voice manifest;
- nghỉ 0,6 giây giữa chapter và chapter timestamp tăng dần;
- SRT tự chia cue, tối đa hai dòng và loại source ID/citation;
- encode từng scene H.264/AAC rồi concat bằng FFmpeg đi kèm Remotion;
- cache/resume từng segment theo checksum visual/audio và render config;
- coverage report mapping chapter → scene → source;
- chặn compose nếu visual/voice còn `FAILED`;
- FFprobe final QA cho duration, codec, resolution, fps và audio stream;
- checksum cho MP4, SRT và coverage report.

## Bước implementation tiếp theo

Pipeline Module 1–6, job API, Firebase multi-user, outline approval, result
navigation và feedback đã chạy. UI thư viện chỉ hiển thị job/PDF thật, không còn
seed data. Đường găng tiếp theo là progress/timeout theo module, quota theo user
và chạy golden-set/user validation.
