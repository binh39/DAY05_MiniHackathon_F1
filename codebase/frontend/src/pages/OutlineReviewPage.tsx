import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  approveOutline,
  artifactBlobUrl,
  getOutline,
  saveOutline,
  type OutlineDraft,
  type OutlinePreview,
} from "../api";
import { useNavigate, useRouter } from "../router";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} phút ${String(rest).padStart(2, "0")} giây`;
}

const detailLabels = {
  brief: "Ngắn gọn",
  standard: "Tiêu chuẩn",
  deep: "Chuyên sâu",
} as const;

export function OutlineReviewPage() {
  const { pathname } = useRouter();
  const navigate = useNavigate();
  const jobId = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const [preview, setPreview] = useState<OutlinePreview | null>(null);
  const [draft, setDraft] = useState<OutlineDraft | null>(null);
  const [thumbnail, setThumbnail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getOutline(jobId);
        if (!active) return;
        setPreview(result);
        setDraft(result.plan.draft);
        setThumbnail(
          await artifactBlobUrl(result.document.first_thumbnail_url),
        );
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải outline.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  const chapterDetails = useMemo(
    () =>
      new Map(
        preview?.plan.chapters.map((chapter) => [
          chapter.chapter_id,
          chapter,
        ]) ?? [],
      ),
    [preview],
  );

  function updateChapter(
    index: number,
    updates: Partial<OutlineDraft["chapters"][number]>,
  ) {
    setDraft((current) => {
      if (!current) return current;
      const chapters = [...current.chapters];
      const chapter = chapters[index];
      if (!chapter) return current;
      chapters[index] = { ...chapter, ...updates };
      return { ...current, chapters };
    });
    setNotice("");
  }

  function moveChapter(index: number, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.chapters.length) return current;
      const chapters = [...current.chapters];
      [chapters[index], chapters[nextIndex]] = [
        chapters[nextIndex]!,
        chapters[index]!,
      ];
      return { ...current, chapters };
    });
    setNotice("");
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveOutline(jobId, draft);
      setPreview(result);
      setDraft(result.plan.draft);
      setNotice("Đã lưu bản chỉnh sửa.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Không thể lưu outline.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!draft) return;
    setApproving(true);
    setError("");
    try {
      await approveOutline(jobId, draft);
      navigate("/app/videos", { state: { approved: true } });
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Không thể duyệt outline.",
      );
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="outline-loading">
        <span className="spinner large" />
        <strong>Đang tải kết quả phân tích...</strong>
      </div>
    );
  }
  if (!preview || !draft) {
    return (
      <div className="empty-state">
        <span><AlertTriangle size={28} /></span>
        <h3>Không thể mở outline</h3>
        <p>{error || "Job chưa sẵn sàng để duyệt."}</p>
        <button className="secondary-button" onClick={() => navigate("/app/videos")}>
          <ArrowLeft size={17} /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="outline-page page-enter">
      <button className="outline-back" onClick={() => navigate("/app/videos")}>
        <ArrowLeft size={17} /> Video của tôi
      </button>
      <div className="page-heading outline-heading">
        <div>
          <div className="eyebrow"><Sparkles size={16} /> AI đã phân tích xong</div>
          <h1>Duyệt outline bài giảng</h1>
          <p>Kiểm tra cấu trúc trước khi hệ thống sinh lời giảng, voice và video.</p>
        </div>
        <div className="outline-status">
          <CheckCircle2 size={20} />
          <span><strong>Module 1–2 hoàn tất</strong>Đang chờ bạn duyệt</span>
        </div>
      </div>

      <div className="outline-layout">
        <aside className="document-preview-panel">
          <div className="outline-panel-title">
            <FileText size={19} />
            <div><strong>Tài liệu nguồn</strong><span>{preview.document.total_pages} trang</span></div>
          </div>
          {thumbnail && (
            <img
              className="document-first-page"
              src={thumbnail}
              alt="Thumbnail trang đầu"
            />
          )}
          <h3>{preview.document.title}</h3>
          <div className="document-facts">
            <span><Layers3 size={15} /> {preview.document.sections.length} section</span>
            <span><BookOpen size={15} /> {preview.document.total_sources} nguồn</span>
          </div>
          <div className="section-preview-list">
            {preview.document.sections.map((section) => (
              <div key={section.section_id}>
                <strong>{section.title}</strong>
                <span>
                  Trang {section.page_numbers.length
                    ? `${section.page_numbers[0]}–${section.page_numbers.at(-1)}`
                    : "chưa xác định"}
                </span>
                {section.concepts.length > 0 && (
                  <small>{section.concepts.slice(0, 3).join(" · ")}</small>
                )}
              </div>
            ))}
          </div>
          {preview.document.warnings.length > 0 && (
            <div className="outline-warning">
              <AlertTriangle size={17} />
              <div>
                <strong>{preview.document.warnings.length} cảnh báo</strong>
                <span>{preview.document.warnings[0]}</span>
              </div>
            </div>
          )}
        </aside>

        <main className="outline-editor">
          <div className="outline-summary-row">
            <label>
              Tiêu đề bài giảng
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
            </label>
            <div className="outline-metric">
              <Clock3 size={19} />
              <span>Ước tính ban đầu<strong>{formatDuration(preview.plan.estimated_duration_seconds)}</strong></span>
            </div>
            <div className="outline-metric">
              <CheckCircle2 size={19} />
              <span>Coverage<strong>{Math.round(preview.plan.coverage_rate * 100)}%</strong></span>
            </div>
          </div>

          <div className="chapter-editor-list">
            {draft.chapters.map((chapter, index) => {
              const detail = chapterDetails.get(chapter.chapter_id);
              return (
                <article className="chapter-editor-card" key={chapter.chapter_id}>
                  <div className="chapter-order">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <button
                        onClick={() => moveChapter(index, -1)}
                        disabled={index === 0}
                        aria-label="Đưa chapter lên"
                      ><ArrowUp size={15} /></button>
                      <button
                        onClick={() => moveChapter(index, 1)}
                        disabled={index === draft.chapters.length - 1}
                        aria-label="Đưa chapter xuống"
                      ><ArrowDown size={15} /></button>
                    </div>
                  </div>
                  <div className="chapter-fields">
                    <div className="chapter-field-row">
                      <label>
                        Tên chapter
                        <input
                          value={chapter.title}
                          onChange={(event) =>
                            updateChapter(index, { title: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Mức độ chi tiết
                        <select
                          value={chapter.detail_level}
                          onChange={(event) =>
                            updateChapter(index, {
                              detail_level: event.target
                                .value as typeof chapter.detail_level,
                            })
                          }
                        >
                          {Object.entries(detailLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Mục tiêu học tập — mỗi dòng một mục tiêu
                      <textarea
                        rows={Math.max(2, chapter.learning_objectives.length)}
                        value={chapter.learning_objectives.join("\n")}
                        onChange={(event) =>
                          updateChapter(index, {
                            learning_objectives: event.target.value.split("\n"),
                          })
                        }
                      />
                    </label>
                    <div className="chapter-meta">
                      <span>Trang {detail?.page_numbers.join(", ")}</span>
                      <span>{detail?.items.length ?? 0} nội dung</span>
                      <span>{detail ? formatDuration(detail.duration_seconds) : ""}</span>
                    </div>
                    <details>
                      <summary>Xem nội dung AI đã phân loại</summary>
                      <div className="chapter-items">
                        {detail?.items.map((item) => (
                          <div key={item.item_id}>
                            <span className={`treatment-pill ${item.treatment.toLowerCase()}`}>
                              {item.treatment}
                            </span>
                            <div><strong>{item.title}</strong><small>{item.reason}</small></div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>

      <div className="outline-action-bar">
        <div>
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}
          {!error && !notice && (
            <span>Module 3–6 chỉ bắt đầu sau khi bạn bấm duyệt.</span>
          )}
        </div>
        <button
          className="secondary-button"
          onClick={() => void save()}
          disabled={saving || approving}
        >
          <Save size={17} /> {saving ? "Đang lưu..." : "Lưu bản nháp"}
        </button>
        <button
          className="primary-button"
          onClick={() => void approve()}
          disabled={saving || approving}
        >
          <Sparkles size={17} />
          {approving ? "Đang tiếp tục pipeline..." : "Duyệt và tạo video"}
        </button>
      </div>
    </div>
  );
}
