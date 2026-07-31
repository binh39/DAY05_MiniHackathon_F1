# VLearn — Video ôn tập có căn cứ từ PDF bài giảng (Nhóm F1 · Zone D305)

> **SPEC → Prototype → Demo.** Nền tảng học tập thích ứng VLearn — Tự động tạo video ôn tập dưới 10 phút kèm trích dẫn trang slide gốc, checkpoint duyệt outline và minh họa trực quan từ PDF bài giảng.

---

## Thành viên nhóm & Phân công trách nhiệm

| Mã học viên     | Họ và tên              | Vai trò              | Phụ trách chính / Artifacts                                                                  |
| --------------- | ---------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| **2A202601901** | **Đồng Đại Huy**       | Spec & Evidence      | `spec.md`, `evidence/mining-log.md`, khảo sát & JTBD                                         |
| **2A202601597** | **Nguyễn Quang Tường** | AI / Eval Engineer   | `eval/golden-set-v1.md`, `eval/run-01-2026-07-30.md`, failure analysis & prompt tuning       |
| **2A202601091** | **Nguyễn Đình Bình**   | Backend Lead         | `codebase/backend/`, LLM Module 1–4, TTS & FFmpeg pipeline, Zod contract & validator         |
| **2A202601979** | **Phạm Đình Minh**     | Frontend / Demo Lead | `codebase/frontend/`, Remotion visual player, outline editor, source trace UI, dry run       |
| **2A202601253** | **Phạm Đức Trung**     | Product / Validation | `validation/feedback-log.md`, User testing (5 willing users), feedback synthesis & changelog |

---

## Bài toán & Lát cắt sản phẩm

- **Hướng chọn:** **Hướng A — VLearn** (Tính năng mới trên VLearn).
- **Problem Statement:** Học viên muốn xem lại kiến thức sau buổi học trong thời gian ngắn (10–20 phút) nhưng phải tự lướt và ghép mạch từ 40–80 trang slide; nhiều slide chỉ có từ khóa hoặc hình ảnh, khiến họ tốn thời gian mà vẫn khó nối lại lời giảng và nắm được bức tranh tổng thể của buổi học.
- **Lát cắt MỘT CÂU:**
  > _Một học viên muốn ôn lại một buổi học từ một PDF hợp lệ dài 40–80 trang; hệ thống quyết định ý nào đủ quan trọng và đủ căn cứ để đưa vào video, ý nào phải cảnh báo hoặc dẫn về nguồn; để người học nhận một video ôn tập tiếng Việt dưới 10 phút có chapter, slide minh họa và liên kết về đúng trang gốc._

---

## 🛠️ Mức độ Prototype (Working Prototype)

- **Loại prototype:** **Working Prototype** (xem tại `codebase/`).
- **AI chạy thật ở quyết định trung tâm:** Gọi Vertex AI (Gemini 1.5 Pro / Flash) phân tích PDF, trích xuất grounding source ID, tạo outline chapter, thẩm định câu claim có căn cứ, sinh kịch bản narration & visual layout.
- **Pipeline xử lý end-to-end:**
  1. Upload PDF & Phân tích OCR / Bounding box (`Module 1 & 2`)
  2. Dừng tại checkpoint **AWAITING_APPROVAL** cho học viên duyệt/sửa Outline.
  3. Resume pipeline (`Module 3-6`): Synth audio qua Google Cloud TTS → Render Remotion Visual → Compose MP4/SRT bằng FFmpeg.
  4. Trình chiếu trên Web Player với tính năng click Chapter nhảy tới trang PDF gốc.

---

## 📂 Cấu trúc Repository

```text
DAY05_MiniHackathon_F1/
├── README.md                 ← File này (Thông tin nhóm, phân công, HDSD)
├── spec.md                   ← AI Spec chi tiết (§1-§9 theo 03-template-ai-spec.md)
├── demo-slides.html          ← Bản slide trình bày demo 6 trang (Render được ra PDF)
├── codebase/                 ← Source code sản phẩm
│   ├── backend/              ← Express.js / TypeScript pipeline backend
│   └── frontend/             ← React / Vite / Tailwind UI frontend
├── eval/                     ← Bộ kiểm thử tự động
│   ├── golden-set-v1.md      ← Golden set 20 test cases (phủ 4 lớp chỗ khó)
│   └── run-01-2026-07-30.md  ← Bảng kết quả chạy baseline (85% pass rate)
├── evidence/                 ← Bằng chứng nghiên cứu & mining
│   └── mining-log.md         ← Mining log 2.522 message chatlog VLearn tutor
├── validation/               ← Kiểm thử với người dùng thật
│   └── feedback-log.md       ← Feedback log từ 5 người dùng ngoài nhóm (CP5)
├── reflection/               ← Đánh giá cá nhân của từng thành viên
│   ├── dong-dai-huy.md
│   ├── nguyen-quang-tuong.md
│   ├── nguyen-dinh-binh.md
│   ├── pham-dinh-minh.md
│   └── pham-duc-trung.md
└── data/                     ← Data pack được BTC cấp (ẩn danh)
```

---

## 🚀 Hướng dẫn Chạy Sản phẩm (Local Setup)

### 1. Yêu cầu môi trường

- Node.js >= 18.x
- npm >= 9.x
- FFmpeg đã cài trong PATH hệ thống (phục vụ render video)

### 2. Chạy Backend (`codebase/backend`)

```bash
cd codebase/backend
npm install
cp .env.example .env   # Cấu hình GEMINI_API_KEY hoặc GCP credentials
npm run dev
```

- Backend lắng nghe tại `http://localhost:3000`.
- API typecheck & unit test: `npm run test`

### 3. Chạy Frontend (`codebase/frontend`)

```bash
cd codebase/frontend
npm install
cp .env.example .env
npm run dev
```

- Truy cập ứng dụng tại `http://localhost:5173`.

---

## 🧪 Kiểm thử & Quality Bar (`eval/`)

- **Quality Bar đã chốt:** Đạt khi ≥90% (18/20) case pass, mọi case P0 pass, 0 grounded claim thiếu/sai `source_id`, 0 video COMPLETED có scene `FAILED`.
- **Golden set 20 cases:** Nằm tại `eval/golden-set-v1.md` (gồm 8 case thường, 8 case khó phủ 4 lớp chỗ khó R1-R12, 4 case hiếm).
- **Kết quả Lượt 1 (`eval/run-01-2026-07-30.md`):** 17/20 PASS (85%), 1 FAIL (`G15` lệch duration estimate), 2 NOT RUN (`G17`, `G18`). Phân tích nguyên nhân & kế hoạch khắc phục đã được nêu chi tiết tại `spec.md` §7.

---

## 🔒 Bảo mật dữ liệu

Dữ liệu trong `data/` tuân thủ quy định bảo mật của khóa học: chỉ dùng cho hackathon, không chia sẻ ra ngoài, không commit API key hay data pack nguyên văn lên repo public.
