import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  Link2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  documentBlobUrl,
  generateDocumentSummary,
  type SummaryArtifact,
} from "../api";
import { useLibrary } from "../contexts";
import { useNavigate, useRouter } from "../router";

function formatSourcePages(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((left, right) => left - right);
  if (!sorted.length) return "Nguồn tài liệu";

  const contiguous = sorted.every(
    (page, index) => index === 0 || page === sorted[index - 1] + 1,
  );
  if (contiguous && sorted.length > 2) {
    return `Trang ${sorted[0]}–${sorted.at(-1)}`;
  }
  return `Trang ${sorted.join(", ")}`;
}

function compactSectionLabel(title: string): string {
  const normalized = title.toLocaleLowerCase("vi-VN");
  if (normalized.includes("lịch sử")) return "Lịch sử AI";
  if (normalized.includes("huấn luyện")) return "Huấn luyện";
  if (normalized.includes("agent")) return "AI Agent";
  if (normalized.includes("prompt")) return "Prompting";
  if (normalized.includes("llm")) return "LLM";
  return title.split(/\s+/).slice(0, 2).join(" ");
}

function estimateReadingMinutes(summary: SummaryArtifact | null): number {
  if (!summary) return 0;
  const content = [
    summary.overview,
    ...summary.key_points.map((point) => point.content),
    summary.conclusion,
    ...summary.warnings,
  ].join(" ");
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function DocumentSummaryPage() {
  const { pathname } = useRouter();
  const navigate = useNavigate();
  const { documents } = useLibrary();
  const documentId = pathname.split("/")[3] ?? "";
  const document = documents.find(
    (item) =>
      item.jobId === documentId || item.summaryJobId === documentId,
  );
  const [pdfUrl, setPdfUrl] = useState("");
  const [summary, setSummary] = useState<SummaryArtifact | null>(null);
  const [error, setError] = useState("");
  const [pdfVisible, setPdfVisible] = useState(true);
  const [mobilePane, setMobilePane] = useState<"pdf" | "summary">("summary");
  const [activeSectionId, setActiveSectionId] = useState("summary-overview");
  const summaryPaneRef = useRef<HTMLElement>(null);
  const summaryTocRef = useRef<HTMLElement>(null);

  const readingMinutes = useMemo(
    () => estimateReadingMinutes(summary),
    [summary],
  );
  const sectionCount = summary ? summary.key_points.length + 2 : 0;
  const pageCount = document?.pages;
  const summarySectionIds = useMemo(
    () => [
      "summary-overview",
      ...(summary?.key_points.map((_, index) => `summary-point-${index}`) ?? []),
      "summary-conclusion",
    ],
    [summary],
  );

  useEffect(() => {
    let stopped = false;
    void Promise.all([
      documentBlobUrl(documentId),
      generateDocumentSummary(documentId),
    ])
      .then(([nextPdfUrl, nextSummary]) => {
        if (stopped) return;
        setPdfUrl(nextPdfUrl);
        setSummary(nextSummary);
      })
      .catch((loadError: unknown) => {
        if (!stopped) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tạo bản tóm tắt.",
          );
        }
      });
    return () => {
      stopped = true;
    };
  }, [documentId]);

  useEffect(() => {
    const pane = summaryPaneRef.current;
    if (!summary || !pane) return;

    let animationFrame = 0;
    const updateActiveSection = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const activationLine = pane.getBoundingClientRect().top + 92;
        let nextActiveSection = summarySectionIds[0];

        for (const sectionId of summarySectionIds) {
          const section = globalThis.document.getElementById(sectionId);
          if (!section) continue;
          if (section.getBoundingClientRect().top <= activationLine) {
            nextActiveSection = sectionId;
          } else {
            break;
          }
        }

        const isAtBottom =
          pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 12;
        if (isAtBottom) {
          nextActiveSection = summarySectionIds.at(-1) ?? nextActiveSection;
        }

        setActiveSectionId((current) =>
          current === nextActiveSection ? current : nextActiveSection,
        );
      });
    };

    setActiveSectionId(summarySectionIds[0]);
    updateActiveSection();
    pane.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      cancelAnimationFrame(animationFrame);
      pane.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [summary, summarySectionIds]);

  useEffect(() => {
    const toc = summaryTocRef.current;
    const activeLink = toc?.querySelector<HTMLElement>(
      `[data-section-id="${activeSectionId}"]`,
    );
    if (!toc || !activeLink) return;

    const centeredLeft =
      activeLink.offsetLeft - (toc.clientWidth - activeLink.clientWidth) / 2;
    toc.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
  }, [activeSectionId]);

  function scrollToSummarySection(sectionId: string) {
    const pane = summaryPaneRef.current;
    const target = globalThis.document.getElementById(sectionId);
    if (!pane || !target) return;

    const paneTop = pane.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const tocHeight = summaryTocRef.current?.offsetHeight ?? 0;
    const nextScrollTop = pane.scrollTop + targetTop - paneTop - tocHeight - 8;

    setActiveSectionId(sectionId);
    pane.scrollTo({ top: Math.max(0, nextScrollTop), behavior: "smooth" });
  }

  function togglePdf() {
    setPdfVisible((visible) => {
      if (visible) setMobilePane("summary");
      return !visible;
    });
  }

  return (
    <div className="document-summary-page">
      <header className="document-summary-header">
        <div className="document-summary-header-main">
          <button
            className="summary-back-button"
            onClick={() => navigate("/app/documents")}
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>
          <div className="summary-document-identity">
            <span><FileText size={17} /></span>
            <div>
              <small>TÀI LIỆU</small>
              <strong title={document?.name}>
                {document?.name ?? "Tài liệu PDF"}
              </strong>
            </div>
          </div>
        </div>

        <div className="document-summary-header-actions">
          {pageCount && (
            <span className="summary-document-badge">
              <Layers3 size={14} /> {pageCount} trang
            </span>
          )}
          <span className="summary-document-badge is-ready">
            <CheckCircle2 size={14} /> Đã phân tích
          </span>
          <button
            className="summary-header-action"
            onClick={togglePdf}
            aria-pressed={!pdfVisible}
            title={pdfVisible ? "Ẩn tài liệu gốc" : "Hiện tài liệu gốc"}
          >
            {pdfVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{pdfVisible ? "Ẩn PDF" : "Hiện PDF"}</span>
          </button>
          {pdfUrl ? (
            <a
              className="summary-header-action is-primary"
              href={pdfUrl}
              download={document?.name ?? "tai-lieu.pdf"}
            >
              <Download size={16} />
              <span>Tải xuống</span>
            </a>
          ) : (
            <button className="summary-header-action is-primary" disabled>
              <Download size={16} />
              <span>Tải xuống</span>
            </button>
          )}
        </div>
      </header>

      <div className="document-summary-mobile-tabs" role="tablist" aria-label="Chế độ đọc">
        <button
          role="tab"
          aria-selected={mobilePane === "pdf"}
          className={mobilePane === "pdf" ? "active" : ""}
          onClick={() => {
            setPdfVisible(true);
            setMobilePane("pdf");
          }}
        >
          <BookOpenText size={16} /> Tài liệu gốc
        </button>
        <button
          role="tab"
          aria-selected={mobilePane === "summary"}
          className={mobilePane === "summary" ? "active" : ""}
          onClick={() => setMobilePane("summary")}
        >
          <Sparkles size={16} /> Tóm tắt AI
        </button>
      </div>

      <div
        className={`document-summary-split ${pdfVisible ? "" : "pdf-hidden"} mobile-${mobilePane}`}
      >
        {pdfVisible && (
          <section className="pdf-reading-column" aria-label="Tài liệu gốc">
            <div className="pdf-pane-header">
              <div>
                <span><BookOpenText size={16} /></span>
                <div>
                  <strong>Tài liệu gốc</strong>
                  <small>Đối chiếu trực tiếp với bản PDF</small>
                </div>
              </div>
              <span className="pdf-pane-format">PDF</span>
            </div>
            <div className="pdf-reading-pane">
              {pdfUrl ? (
                <iframe src={pdfUrl} title={`PDF ${document?.name ?? ""}`} />
              ) : (
                <div className="summary-loading">
                  <span className="spinner" /> Đang tải PDF...
                </div>
              )}
            </div>
          </section>
        )}

        <article
          ref={summaryPaneRef}
          className="summary-reading-pane"
          aria-label="Tóm tắt tài liệu bằng AI"
        >
          <div className="summary-reader-inner">
            <div className="summary-pane-title">
              <span><Sparkles size={22} /></span>
              <div>
                <small>TÓM TẮT BẰNG AI</small>
                <h1>{summary?.title ?? "Đang tạo bản tóm tắt..."}</h1>
                <div className="summary-reader-meta">
                  {sectionCount > 0 && (
                    <span><Layers3 size={13} /> {sectionCount} mục chính</span>
                  )}
                  {readingMinutes > 0 && (
                    <span><Clock3 size={13} /> {readingMinutes} phút đọc</span>
                  )}
                  {pageCount && (
                    <span><FileText size={13} /> {pageCount} trang gốc</span>
                  )}
                </div>
              </div>
            </div>

            {summary && (
              <nav
                ref={summaryTocRef}
                className="summary-toc"
                aria-label="Mục lục tóm tắt"
              >
                <a
                  href="#summary-overview"
                  data-section-id="summary-overview"
                  className={activeSectionId === "summary-overview" ? "active" : ""}
                  aria-current={activeSectionId === "summary-overview" ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSummarySection("summary-overview");
                  }}
                >
                  Tổng quan
                </a>
                {summary.key_points.map((point, index) => (
                  <a
                    href={`#summary-point-${index}`}
                    key={`${point.heading}-nav`}
                    data-section-id={`summary-point-${index}`}
                    className={activeSectionId === `summary-point-${index}` ? "active" : ""}
                    aria-current={activeSectionId === `summary-point-${index}` ? "location" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSummarySection(`summary-point-${index}`);
                    }}
                  >
                    {compactSectionLabel(point.heading)}
                  </a>
                ))}
                <a
                  href="#summary-conclusion"
                  data-section-id="summary-conclusion"
                  className={activeSectionId === "summary-conclusion" ? "active" : ""}
                  aria-current={activeSectionId === "summary-conclusion" ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSummarySection("summary-conclusion");
                  }}
                >
                  Kết luận
                </a>
              </nav>
            )}

            {error ? (
              <div className="summary-error">{error}</div>
            ) : !summary ? (
              <div className="summary-loading">
                <span className="spinner" />
                Gemini đang tổng hợp nội dung từ kết quả phân tích tài liệu...
              </div>
            ) : (
              <div className="summary-content">
                <section className="summary-section-card" id="summary-overview">
                  <div className="summary-section-heading">
                    <span>01</span>
                    <h2>Tổng quan</h2>
                  </div>
                  <p>{summary.overview}</p>
                </section>

                {summary.key_points.map((point, index) => (
                  <section
                    className="summary-section-card"
                    id={`summary-point-${index}`}
                    key={`${point.heading}-${index}`}
                  >
                    <div className="summary-section-heading">
                      <span>{String(index + 2).padStart(2, "0")}</span>
                      <div>
                        <h2>{point.heading}</h2>
                        <span className="summary-source-chip">
                          <Link2 size={13} />
                          {formatSourcePages(point.source_pages)}
                        </span>
                      </div>
                    </div>
                    <p>{point.content}</p>
                  </section>
                ))}

                <section
                  className="summary-conclusion"
                  id="summary-conclusion"
                >
                  <span><Sparkles size={18} /></span>
                  <div>
                    <small>KẾT LUẬN CỐT LÕI</small>
                    <h2>Kết luận</h2>
                    <p>{summary.conclusion}</p>
                  </div>
                </section>

                {summary.warnings.length > 0 && (
                  <aside className="summary-warning-callout">
                    <span><AlertTriangle size={18} /></span>
                    <div>
                      <strong>Lưu ý khi sử dụng bản tóm tắt</strong>
                      {summary.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  </aside>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
