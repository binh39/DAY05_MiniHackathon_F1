import {
  ArrowUpRight,
  FileText,
  Filter,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLibrary } from "../contexts";
import { useNavigate } from "../router";

export function DocumentsPage() {
  const { documents, removeDocument } = useLibrary();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
          <div className="eyebrow">
            <FileText size={16} /> Thư viện
          </div>
          <h1>Tài liệu của tôi</h1>
          <p>Quản lý các tài liệu bạn đã tải lên hệ thống.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/app/create")}>
          <Plus size={18} /> Tải tài liệu mới
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon purple"><FileText size={20} /></span>
          <div><strong>{documents.length}</strong><span>Tổng tài liệu</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon mint"><Video size={20} /></span>
          <div><strong>12</strong><span>Video đã tạo</span></div>
        </div>
        <div className="stat-card wide-stat">
          <div className="storage-row">
            <span>Dung lượng lưu trữ</span><strong>1,2 / 5 GB</strong>
          </div>
          <div className="storage-track"><span /></div>
        </div>
      </div>

      <div className="library-toolbar">
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
                <div className="card-menu-wrap">
                  <button
                    className="icon-button"
                    onClick={() =>
                      setActiveMenu(activeMenu === document.id ? null : document.id)
                    }
                    aria-label="Thêm tùy chọn"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {activeMenu === document.id && (
                    <div className="card-menu">
                      <button onClick={() => navigate("/app/create")}>
                        <Video size={16} /> Tạo video
                      </button>
                      <button className="danger" onClick={() => setDeleteId(document.id)}>
                        <Trash2 size={16} /> Xóa tài liệu
                      </button>
                    </div>
                  )}
                </div>
                <strong title={document.name}>{document.name}</strong>
                <p>{document.pages} trang · {document.size}</p>
                <div className="document-meta">
                  <span>{document.uploadedAt}</span>
                  <span className={`status-pill ${document.status}`}>
                    {document.status === "ready" ? "Sẵn sàng" : "Đang phân tích"}
                  </span>
                </div>
                <button className="document-action" onClick={() => navigate("/app/create")}>
                  Tạo video từ tài liệu <ArrowUpRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span><Search size={28} /></span>
          <h3>Không tìm thấy tài liệu</h3>
          <p>Thử một từ khóa khác hoặc tải tài liệu mới lên.</p>
          <button className="primary-button" onClick={() => navigate("/app/create")}>
            <Upload size={17} /> Tải PDF lên
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".pdf" className="sr-only" />

      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <span className="danger-icon"><Trash2 size={23} /></span>
            <h3>Xóa tài liệu?</h3>
            <p>Tài liệu sẽ bị xóa khỏi thư viện. Các video đã tạo vẫn được giữ lại.</p>
            <div>
              <button className="secondary-button" onClick={() => setDeleteId(null)}>Hủy</button>
              <button
                className="danger-button"
                onClick={() => {
                  removeDocument(deleteId);
                  setDeleteId(null);
                  setActiveMenu(null);
                }}
              >Xóa tài liệu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
