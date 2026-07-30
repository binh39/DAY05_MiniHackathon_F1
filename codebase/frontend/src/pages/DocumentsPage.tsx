import {
  ArrowUpRight,
  AlignLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Grid2X2,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLibrary } from "../contexts";
import { useNavigate } from "../router";

function documentStageLabel(stage?: string): string {
  const labels: Record<string, string> = {
    QUEUED: "Đang xếp hàng phân tích",
    STARTING: "Đang khởi tạo phân tích",
    VALIDATING_PDF: "Đang kiểm tra tệp PDF",
    PREPARING_DOCUMENT: "Đang chuẩn bị tài liệu",
    READING_DOCUMENT: "AI đang đọc nội dung",
    EXTRACTING_CONTENT: "Đang trích xuất nội dung",
    RENDERING_PAGES: "Đang xử lý các trang PDF",
    ANALYZING_DOCUMENT: "AI đang phân tích tài liệu",
    DOCUMENT_READY: "Tài liệu đã sẵn sàng",
    QUEUED_FOR_MODULE_RETRY: "Video đang chuẩn bị chạy lại",
    GENERATING_SCRIPT: "Video đang viết lại kịch bản",
    GENERATING_STORYBOARD: "Video đang dựng storyboard",
    GENERATING_VISUALS: "Video đang tạo hình ảnh",
    GENERATING_VOICE: "Video đang tạo giọng đọc",
    GENERATING_ASSETS_PARALLEL: "Video đang tạo hình ảnh và giọng đọc",
    COMPOSING_VIDEO: "Video đang ghép nội dung",
    MODULE_FAILED: "Video cần được thử lại ở trang Video của tôi",
  };
  return labels[stage ?? ""] ?? "AI đang phân tích tài liệu";
}

export function DocumentsPage() {
  const { documents, videos, deleteLibraryJob } = useLibrary();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteError, setDeleteError] = useState("");

  async function removeDocument(jobId: string, name: string) {
    if (
      !window.confirm(
        `Xóa "${name}" cùng video và toàn bộ artifact liên quan? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    try {
      setDeleteError("");
      await deleteLibraryJob(jobId);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Không thể xóa tài liệu.",
      );
    }
  }

  const filtered = useMemo(
    () =>
      documents.filter((document) =>
        document.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [documents, query],
  );
  return (
    <div className="library-page page-enter">
      <div className="page-heading library-heading">
        <div>
          <h1>Tài liệu của tôi</h1>
          <p>Quản lý các tài liệu bạn đã tải lên hệ thống.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/app/create")}>
          <Plus size={18} /> Tải tài liệu mới
        </button>
      </div>

      <div className="video-summary-banner unified-library-bar">
        <div>
          <span className="summary-badge"><FileText size={19} /></span>
          <div><strong>{documents.length}</strong><span>Tổng tài liệu</span></div>
        </div>
        <div>
          <span className="summary-badge mint"><Video size={19} /></span>
          <div>
            <strong>{videos.filter((video) => video.status === "ready").length}</strong>
            <span>Video đã tạo</span>
          </div>
        </div>
        <div className="library-toolbar unified-library-toolbar">
          <label className="search-box">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm tài liệu..."
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">
                <X size={17} />
              </button>
            )}
          </label>
          <button className="toolbar-button"><Filter size={18} /> Bộ lọc</button>
          <div className="view-toggle">
            <button
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Dạng lưới"
            ><Grid2X2 size={18} /></button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="Dạng danh sách"
            ><List size={19} /></button>
          </div>
        </div>
      </div>
      {deleteError && <p className="library-error">{deleteError}</p>}

      {filtered.length ? (
        <div className={`document-collection ${view}`}>
          {filtered.map((document) => {
            const isReady = document.status === "ready";
            const linkedVideo = videos.find(
              (video) => video.jobId === document.jobId,
            );
            const hasVideoJob = document.status === "video" || Boolean(linkedVideo);
            const hasReadyVideo = linkedVideo?.status === "ready";
            const canSummarize =
              Boolean(document.summaryJobId) ||
              isReady ||
              hasReadyVideo ||
              linkedVideo?.modules?.module1_document_intelligence.status ===
                "COMPLETED";
            const progress = isReady
              ? 100
              : Math.max(0, Math.min(hasVideoJob ? 100 : 99, document.progress ?? 0));
            const statusText = isReady
              ? "Sẵn sàng tạo video"
              : documentStageLabel(document.stage);

            return (
              <article
                className={`document-card ${isReady || hasReadyVideo ? "is-ready" : "is-analyzing"} ${hasVideoJob ? "has-video-job" : ""} ${hasReadyVideo ? "has-ready-video" : ""}`}
                key={document.id}
              >
                <div
                  className="document-cover"
                  style={{ "--doc-color": document.color } as React.CSSProperties}
                >
                  <div className="document-cover-top">
                    <span className="pdf-ribbon">PDF</span>
                    <span className="document-cover-status">
                      {isReady || hasReadyVideo ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                      {hasReadyVideo
                        ? "Đã có video"
                        : isReady
                          ? "Sẵn sàng"
                          : hasVideoJob
                            ? "Video"
                            : `${progress}%`}
                    </span>
                  </div>
                  <div className="document-cover-illustration">
                    <span><FileText size={38} /></span>
                    <strong>
                      {hasReadyVideo
                        ? "Video đã hoàn tất"
                        : isReady
                          ? "Tài liệu đã sẵn sàng"
                          : hasVideoJob
                            ? "Đã dùng để tạo video"
                            : "Đang phân tích bằng AI"}
                    </strong>
                  </div>
                  <div className="document-cover-footer">
                    <span>{document.pages ? `${document.pages} trang` : "Đang đọc số trang"}</span>
                    <span>{document.size}</span>
                  </div>
                </div>
                <div className="document-info">
                  <div className="document-title-row">
                    <strong title={document.name}>{document.name}</strong>
                    <span className={`status-pill ${hasReadyVideo ? "ready" : document.status}`}>
                      {hasReadyVideo
                        ? "Đã có video"
                        : isReady
                          ? "Sẵn sàng"
                          : hasVideoJob
                            ? "Đang tạo video"
                            : "Đang xử lý"}
                    </span>
                  </div>
                  <p className="document-file-facts">
                    {document.pages ? `${document.pages} trang` : "Tệp PDF"}
                    <span />
                    {document.size}
                  </p>
                  {hasReadyVideo ? (
                    <div className="document-ready-summary video-ready-summary">
                      <CheckCircle2 size={16} />
                      <span>Video đã tạo hoàn tất. Bạn có thể xem video hoặc mở bản tóm tắt tài liệu.</span>
                    </div>
                  ) : !isReady ? (
                    <div className="library-document-progress">
                      <div className="library-document-progress-heading">
                        <span><Clock3 size={15} /> {statusText}</span>
                        <strong>{progress}%</strong>
                      </div>
                      <div className="document-analysis-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <small>{hasVideoJob ? "Theo dõi hoặc thử lại video ở trang Video của tôi." : "Tiến trình được cập nhật tự động. Bạn có thể tạo video khi hoàn tất 100%."}</small>
                    </div>
                  ) : (
                    <div className="document-ready-summary">
                      <CheckCircle2 size={16} />
                      <span>PDF đã phân tích xong và có thể dùng để tạo bài giảng.</span>
                    </div>
                  )}
                  <div className="document-meta">
                    <span>Đã tải lên {document.uploadedAt}</span>
                  </div>
                  <div className="document-card-actions">
                    <button
                      className="document-action primary-document-action"
                      disabled={!isReady && !hasVideoJob}
                      onClick={() => {
                        if (hasVideoJob) {
                          navigate("/app/videos");
                          return;
                        }
                        navigate("/app/create", {
                          state: { documentId: document.jobId },
                        });
                      }}
                    >
                      {hasVideoJob ? "Xem video" : "Tạo video"} <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="document-action summary-action secondary-document-action"
                      disabled={
                        !canSummarize ||
                        !(document.summaryJobId ?? document.jobId)
                      }
                      onClick={() =>
                        navigate(
                          `/app/documents/${document.summaryJobId ?? document.jobId}/summary`,
                        )
                      }
                    >
                      <AlignLeft size={16} /> Tóm tắt
                    </button>
                    {document.jobId && isReady && (
                      <button
                        className="delete-library-button"
                        onClick={() => void removeDocument(document.jobId!, document.name)}
                        aria-label={`Xóa ${document.name}`}
                        title="Xóa job và toàn bộ artifact"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span>{query ? <Search size={28} /> : <FileText size={28} />}</span>
          <h3>{query ? "Không tìm thấy tài liệu" : "Chưa có tài liệu nào"}</h3>
          <p>
            {query
              ? "Thử một từ khóa khác hoặc tải tài liệu mới lên."
              : "Các PDF bạn thực sự tải lên sẽ xuất hiện tại đây."}
          </p>
          <button className="primary-button" onClick={() => navigate("/app/create")}>
            <Upload size={17} /> Tải PDF lên
          </button>
        </div>
      )}
    </div>
  );
}
