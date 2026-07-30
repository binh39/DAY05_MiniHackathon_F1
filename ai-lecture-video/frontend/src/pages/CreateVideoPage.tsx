import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Info,
  LayoutTemplate,
  Monitor,
  RectangleVertical,
  Sparkles,
  Square,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useLibrary } from "../contexts";
import { useNavigate } from "../router";
import type { AspectRatio, DurationOption } from "../types";

const durations: DurationOption[] = [
  "0–1 phút",
  "1–3 phút",
  "3–5 phút",
  "5–8 phút",
  "8–10 phút",
];

const ratios: Array<{
  value: AspectRatio;
  label: string;
  hint: string;
  icon: typeof Monitor;
}> = [
  { value: "16:9", label: "Ngang", hint: "YouTube, bài giảng", icon: Monitor },
  { value: "9:16", label: "Dọc", hint: "TikTok, Reels", icon: RectangleVertical },
  { value: "1:1", label: "Vuông", hint: "Mạng xã hội", icon: Square },
];

export function CreateVideoPage() {
  const { createVideo } = useLibrary();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<DurationOption>("5–8 phút");
  const [language, setLanguage] = useState("Tiếng Việt");
  const [voice, setVoice] = useState("Giọng nữ · Tự nhiên");
  const [style, setStyle] = useState("Hiện đại & tối giản");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function acceptFile(nextFile?: File) {
    if (!nextFile) return;
    if (
      nextFile.type !== "application/pdf" &&
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Vui lòng chọn đúng định dạng PDF.");
      return;
    }
    if (nextFile.size > 50 * 1024 * 1024) {
      setError("PDF vượt giới hạn 50 MB.");
      return;
    }
    setFile(nextFile);
    setTitle(nextFile.name.replace(/\.pdf$/i, ""));
    setError("");
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Hãy tải lên một tài liệu PDF để tiếp tục.");
      return;
    }
    setSubmitting(true);
    try {
      await createVideo({ file, title, ratio, duration });
      navigate("/app/videos", { state: { created: true } });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? `Không thể tạo job: ${submitError.message}`
          : "Không thể kết nối backend.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="create-page page-enter">
      <div className="page-heading create-heading">
        <div>
          <div className="eyebrow">
            <WandSparkles size={16} /> AI Video Generator
          </div>
          <h1>Tạo video bài giảng mới</h1>
          <p>Biến tài liệu PDF thành video dễ hiểu, sinh động trong vài phút.</p>
        </div>
        <div className="steps">
          <span className="active"><i>1</i>Tài liệu</span>
          <b />
          <span><i>2</i>Tùy chỉnh</span>
          <b />
          <span><i>3</i>Duyệt outline</span>
        </div>
      </div>

      <form onSubmit={submit} className="create-grid">
        <section className="main-form-column">
          <div className="form-card upload-card">
            <div className="card-title-row">
              <span className="section-number">1</span>
              <div>
                <h2>Tải tài liệu lên</h2>
                <p>AI sẽ phân tích toàn bộ nội dung trong PDF.</p>
              </div>
            </div>
            {!file ? (
              <button
                type="button"
                className={`drop-zone ${dragging ? "dragging" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={drop}
              >
                <span className="upload-icon">
                  <UploadCloud size={28} />
                </span>
                <strong>Kéo thả PDF vào đây</strong>
                <span>
                  hoặc <u>chọn tệp từ máy tính</u>
                </span>
                <small>Tối đa 50 MB · 80 trang · Chỉ định dạng PDF</small>
              </button>
            ) : (
              <div className="selected-file">
                <span className="file-icon">
                  <FileText size={24} />
                </span>
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng phân tích
                  </small>
                </div>
                <span className="ready-check">
                  <Check size={17} />
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setFile(null)}
                  aria-label="Xóa tệp"
                >
                  <X size={19} />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            {error && <p className="form-error upload-error">{error}</p>}
          </div>

          <div className="form-card">
            <div className="card-title-row">
              <span className="section-number">2</span>
              <div>
                <h2>Tùy chỉnh video</h2>
                <p>Chọn định dạng phù hợp với nhu cầu của bạn.</p>
              </div>
            </div>
            <div className="field-group">
              <label>Tiêu đề video</label>
              <input
                className="text-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhập tiêu đề video"
              />
            </div>
            <div className="field-group">
              <label>
                Tỉ lệ khung hình <Info size={15} />
              </label>
              <div className="ratio-grid">
                {ratios.map(({ value, label, hint, icon: Icon }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setRatio(value)}
                    className={`option-card ${ratio === value ? "selected" : ""}`}
                  >
                    <Icon size={25} />
                    <span>
                      <strong>{value} · {label}</strong>
                      <small>{hint}</small>
                    </span>
                    {ratio === value && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-group">
              <label>
                Thời lượng mong muốn <Clock3 size={15} />
              </label>
              <div className="duration-options">
                {durations.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setDuration(item)}
                    className={duration === item ? "selected" : ""}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="field-help">
                AI sẽ ưu tiên nội dung quan trọng để phù hợp với thời lượng.
              </p>
            </div>
            <div className="select-grid">
              <label>
                Ngôn ngữ
                <span className="select-wrap">
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option>Tiếng Việt</option>
                    <option>English</option>
                  </select>
                  <ChevronDown size={17} />
                </span>
              </label>
              <label>
                Giọng đọc
                <span className="select-wrap">
                  <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                    <option>Giọng nữ · Tự nhiên</option>
                    <option>Giọng nam · Trầm ấm</option>
                    <option>Giọng nữ · Năng động</option>
                  </select>
                  <ChevronDown size={17} />
                </span>
              </label>
            </div>
            <div className="field-group">
              <label>Phong cách hình ảnh</label>
              <div className="style-options">
                {["Hiện đại & tối giản", "Học thuật", "Năng động"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setStyle(item)}
                    className={style === item ? "selected" : ""}
                  >
                    <LayoutTemplate size={19} />
                    {item}
                    {style === item && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="summary-column">
          <div className="summary-card">
            <div className="summary-icon">
              <Sparkles size={22} />
            </div>
            <h3>Tóm tắt thiết lập</h3>
            <div className="summary-list">
              <div>
                <span>Tài liệu</span>
                <strong>{file?.name ?? "Chưa tải lên"}</strong>
              </div>
              <div>
                <span>Tỉ lệ</span>
                <strong>{ratio}</strong>
              </div>
              <div>
                <span>Thời lượng</span>
                <strong>{duration}</strong>
              </div>
              <div>
                <span>Ngôn ngữ</span>
                <strong>{language}</strong>
              </div>
              <div>
                <span>Giọng đọc</span>
                <strong>{voice.split(" · ")[0]}</strong>
              </div>
            </div>
            <div className="estimate-box">
              <Clock3 size={18} />
              <div>
                <span>Phân tích và tạo outline</span>
                <strong>Khoảng 2–10 phút</strong>
              </div>
            </div>
            <button className="primary-button create-submit" disabled={submitting}>
              {submitting ? (
                <><span className="spinner" /> Đang khởi tạo...</>
              ) : (
                <>Phân tích và tạo outline <ArrowRight size={18} /></>
              )}
            </button>
            <p className="summary-note">
              <Check size={15} /> Video chỉ được render sau khi bạn duyệt outline.
            </p>
          </div>
          <div className="tip-card">
            <span>💡</span>
            <div>
              <strong>Mẹo để có video tốt hơn</strong>
              <p>PDF có cấu trúc rõ ràng và tiêu đề đầy đủ sẽ cho kết quả tốt nhất.</p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
