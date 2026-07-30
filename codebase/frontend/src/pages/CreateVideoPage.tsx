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
  useEffect,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useLibrary } from "../contexts";
import { useNavigate, useRouter } from "../router";
import type {
  AspectRatio,
  DurationOption,
  LanguageCode,
  VisualStyle,
} from "../types";

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

const languageLabels: Record<LanguageCode, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

const voices: Record<LanguageCode, Array<{ id: string; label: string }>> = {
  vi: [
    { id: "vi-VN-Neural2-A", label: "Giọng nữ · Tự nhiên" },
    { id: "vi-VN-Neural2-D", label: "Giọng nam · Trầm ấm" },
  ],
  en: [
    { id: "en-US-Neural2-F", label: "Female · Natural" },
    { id: "en-US-Neural2-D", label: "Male · Warm" },
    { id: "en-US-Neural2-H", label: "Female · Energetic" },
  ],
};

const visualStyles: Array<{ id: VisualStyle; label: string }> = [
  { id: "modern_minimal", label: "Hiện đại & tối giản" },
  { id: "academic", label: "Học thuật" },
  { id: "dynamic", label: "Năng động" },
];

function quotaPercentage(used: number, limit: number) {
  if (!limit) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

const analysisStageLabels: Record<string, string> = {
  QUEUED: "Đang xếp hàng phân tích",
  STARTING: "Đang khởi động AI",
  VALIDATING_PDF: "Đang kiểm tra tệp PDF",
  PREPARING_ANALYSIS: "Đang chuẩn bị nội dung",
  READING_DOCUMENT_CONTENT: "AI đang đọc nội dung tài liệu",
  STRUCTURING_DOCUMENT: "Đang tổ chức kiến thức",
  RENDERING_PAGES: "Đang xử lý các trang tài liệu",
  FINALIZING_DOCUMENT: "Đang hoàn tất phân tích",
  ANALYZING_DOCUMENT: "AI đang phân tích tài liệu",
};

function analysisStageLabel(stage?: string) {
  return stage ? (analysisStageLabels[stage] ?? "AI đang phân tích tài liệu") : "Đang chuẩn bị phân tích";
}

export function CreateVideoPage() {
  const {
    createVideo,
    saveDocument,
    documents,
    quota,
    refreshQuota,
  } = useLibrary();
  const navigate = useNavigate();
  const location = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<DurationOption>("5–8 phút");
  const [language, setLanguage] = useState<LanguageCode>("vi");
  const [voiceId, setVoiceId] = useState("vi-VN-Neural2-A");
  const [style, setStyle] = useState<VisualStyle>("modern_minimal");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [savingDocument, setSavingDocument] = useState(false);

  const libraryDocumentId = (
    location.state as { documentId?: string } | null
  )?.documentId;
  const libraryDocument = documents.find(
    (document) => document.jobId === libraryDocumentId,
  );
  const selectedDocument =
    libraryDocument ??
    documents.find((document) => document.jobId === savedDocumentId);
  const documentReady = selectedDocument?.status === "ready";
  const analysisProgress = documentReady
    ? 100
    : Math.max(0, Math.min(99, selectedDocument?.progress ?? 0));
  const analysisLabel = documentReady
    ? "Phân tích hoàn tất"
    : analysisStageLabel(selectedDocument?.stage);
  const documentIsAnalyzing = Boolean(selectedDocument) && !documentReady;

  useEffect(() => {
    void refreshQuota().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!libraryDocument) return;
    setSavedDocumentId(libraryDocument.jobId);
    setFile(null);
    setTitle(libraryDocument.name.replace(/\.pdf$/i, ""));
    setError("");
  }, [libraryDocument?.jobId]);

  async function acceptFile(nextFile?: File) {
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
    setSavedDocumentId(null);
    setTitle(nextFile.name.replace(/\.pdf$/i, ""));
    setError("");
    setSavingDocument(true);
    setUploadProgress(0);
    try {
      setSavedDocumentId(
        await saveDocument(nextFile, setUploadProgress),
      );
    } catch (uploadError) {
      setFile(null);
      setError(
        uploadError instanceof Error
          ? `Không thể lưu PDF: ${uploadError.message}`
          : "Không thể lưu PDF.",
      );
    } finally {
      setSavingDocument(false);
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!file && !selectedDocument) || !savedDocumentId) {
      setError("Hãy tải lên một tài liệu PDF để tiếp tục.");
      return;
    }
    if (!documentReady) {
      setError(`${analysisLabel} · ${analysisProgress}%. Vui lòng chờ đến 100% để tạo video.`);
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    try {
      await createVideo({
        file: file ?? undefined,
        documentId: savedDocumentId,
        documentName: file?.name ?? selectedDocument.name,
        documentSizeBytes: file?.size ?? selectedDocument.sizeBytes,
        title,
        ratio,
        duration,
        language,
        voiceId,
        visualStyle: style,
        onUploadProgress: setUploadProgress,
      });
      setUploadProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
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
            {!file && !libraryDocument ? (
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
                  <strong>{file?.name ?? libraryDocument?.name}</strong>
                  <small>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : libraryDocument?.size}
                    {" · "}
                    {savingDocument
                      ? `Đang lưu ${uploadProgress}%`
                      : documentReady
                        ? "Đã lưu · Phân tích hoàn tất"
                        : `${analysisLabel} · ${analysisProgress}%`}
                  </small>
                </div>
                <span
                  className={`ready-check${documentReady ? "" : " analyzing"}`}
                  aria-label={documentReady ? "Tài liệu đã sẵn sàng" : "Tài liệu đang được AI phân tích"}
                >
                  {documentReady ? <Check size={17} /> : <Sparkles size={17} />}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    setFile(null);
                    setSavedDocumentId(null);
                    navigate("/app/create", { replace: true });
                  }}
                  aria-label="Xóa tệp"
                >
                  <X size={19} />
                </button>
              </div>
            )}
            {!savingDocument && selectedDocument && (
              <div
                className={`document-analysis-progress${documentReady ? " is-ready" : ""}`}
                role="status"
                aria-live="polite"
              >
                <div className="document-analysis-progress-heading">
                  <span>
                    <Sparkles size={15} /> {analysisLabel}
                  </span>
                  <strong>{analysisProgress}%</strong>
                </div>
                <div
                  className="document-analysis-track"
                  role="progressbar"
                  aria-label="Tiến độ phân tích tài liệu"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={analysisProgress}
                >
                  <span style={{ width: `${analysisProgress}%` }} />
                </div>
                <small>
                  {documentReady
                    ? "Tài liệu đã sẵn sàng. Bạn có thể tạo outline và video."
                    : "Nút tạo outline sẽ tự mở khi tiến độ đạt 100%."}
                </small>
              </div>
            )}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => void acceptFile(event.target.files?.[0])}
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
                  <select
                    value={language}
                    onChange={(event) => {
                      const nextLanguage = event.target.value as LanguageCode;
                      setLanguage(nextLanguage);
                      setVoiceId(voices[nextLanguage][0]!.id);
                    }}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                  <ChevronDown size={17} />
                </span>
              </label>
              <label>
                Giọng đọc
                <span className="select-wrap">
                  <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                    {voices[language].map((voice) => (
                      <option value={voice.id} key={voice.id}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} />
                </span>
              </label>
            </div>
            <div className="field-group">
              <label>Phong cách hình ảnh</label>
              <div className="style-options">
                {visualStyles.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setStyle(item.id)}
                    className={style === item.id ? "selected" : ""}
                  >
                    <LayoutTemplate size={19} />
                    {item.label}
                    {style === item.id && <Check size={15} />}
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
            {quota && (
              <div className="quota-summary" aria-label="Hạn mức tài khoản">
                <div className="quota-heading">
                  <strong>Tóm tắt quota</strong>
                  <Info size={16} aria-hidden="true" />
                </div>
                <div className="quota-meter">
                  <div>
                    <span>Thời lượng video</span>
                    <b>
                      {Math.floor(quota.usage.monthly_video_seconds / 60)} / {Math.floor(quota.limits.monthly_video_seconds / 60)} phút
                    </b>
                  </div>
                  <i>
                    <span
                      style={{
                        width: `${quotaPercentage(
                          quota.usage.monthly_video_seconds,
                          quota.limits.monthly_video_seconds,
                        )}%`,
                      }}
                    />
                  </i>
                </div>
                <div className="quota-meter quota-meter-red">
                  <div>
                    <span>Lượt xử lý đồng thời</span>
                    <b>{quota.usage.active_jobs} / {quota.limits.max_active_jobs}</b>
                  </div>
                  <i>
                    <span
                      style={{
                        width: `${quotaPercentage(
                          quota.usage.active_jobs,
                          quota.limits.max_active_jobs,
                        )}%`,
                      }}
                    />
                  </i>
                </div>
                <small className="quota-plan">
                  {quota.retention_days > 0
                    ? `Dữ liệu được lưu ${quota.retention_days} ngày`
                    : "Không gian học thuật VLearn"}
                </small>
              </div>
            )}
            <div className="summary-list">
              <div>
                <span>Tài liệu</span>
                <strong>
                  {file?.name ?? libraryDocument?.name ?? "Chưa tải lên"}
                </strong>
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
                <strong>{languageLabels[language]}</strong>
              </div>
              <div>
                <span>Giọng đọc</span>
                <strong>
                  {voices[language].find((voice) => voice.id === voiceId)?.label}
                </strong>
              </div>
            </div>
            <div className="estimate-box">
              <Clock3 size={18} />
              <div>
                <span>Phân tích và tạo outline</span>
                <strong>Khoảng 2–10 phút</strong>
              </div>
            </div>
            <button
              className="primary-button create-submit"
              disabled={submitting || savingDocument || documentIsAnalyzing}
              title={
                documentIsAnalyzing
                  ? `Tài liệu đang được phân tích: ${analysisProgress}%`
                  : undefined
              }
            >
              {submitting ? (
                <>
                  <span className="spinner" /> Đang tải PDF {uploadProgress}%
                </>
              ) : documentIsAnalyzing ? (
                <>
                  <span className="spinner" /> Đang phân tích tài liệu {analysisProgress}%
                </>
              ) : (
                <>Phân tích và tạo outline <ArrowRight size={18} /></>
              )}
            </button>
            {submitting && (
              <div className="upload-progress-live" aria-live="polite">
                <div>
                  <span style={{ width: `${uploadProgress}%` }} />
                </div>
                <small>
                  Đã gửi {uploadProgress}% dữ liệu tới backend
                </small>
              </div>
            )}
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
