import {
  ArrowUpRight,
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
          {filtered.map((document) => (
            <article className="document-card" key={document.id}>
              <div className="document-cover" style={{ "--doc-color": document.color } as React.CSSProperties}>
                <span className="pdf-ribbon">PDF</span>
                <FileText size={42} />
                <i />
                <i />
                <i />
              </div>
              <div className="document-info">
                <strong title={document.name}>{document.name}</strong>
                <p>
                  {document.pages ? `${document.pages} trang · ` : ""}
                  {document.size}
                </p>
                <div className="document-meta">
                  <span>{document.uploadedAt}</span>
                  <span className={`status-pill ${document.status}`}>
                    {document.status === "ready" ? "Sẵn sàng" : "Đang phân tích"}
                  </span>
                </div>
                <div className="document-card-actions">
                  <button className="document-action" onClick={() => navigate("/app/create")}>
                    Tạo video từ tài liệu <ArrowUpRight size={16} />
                  </button>
                  {document.jobId && document.status === "ready" && (
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
          ))}
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
