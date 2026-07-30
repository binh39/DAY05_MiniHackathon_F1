import {
  CheckCircle2,
  Clock3,
  Download,
  Film,
  Filter,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLibrary } from "../contexts";
import { useNavigate, useRouter } from "../router";
import type { VideoItem } from "../types";

export function VideosPage() {
  const { videos, removeVideo } = useLibrary();
  const navigate = useNavigate();
  const location = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "processing">("all");
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [toast, setToast] = useState(
    Boolean((location.state as { created?: boolean } | null)?.created),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () =>
      videos.filter(
        (video) =>
          (filter === "all" || video.status === filter) &&
          `${video.title} ${video.documentName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [videos, filter, query],
  );

  return (
    <div className="library-page videos-page page-enter">
      {toast && (
        <div className="success-toast">
          <CheckCircle2 size={20} />
          <div>
            <strong>Video đã được đưa vào hàng chờ</strong>
            <span>Bạn có thể theo dõi tiến trình ngay tại đây.</span>
          </div>
          <button onClick={() => setToast(false)}><X size={17} /></button>
        </div>
      )}
      <div className="page-heading library-heading">
        <div>
          <div className="eyebrow"><Film size={16} /> Thành phẩm</div>
          <h1>Video của tôi</h1>
          <p>Xem, chia sẻ và tải xuống những video bạn đã tạo.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/app/create")}>
          <Plus size={18} /> Tạo video mới
        </button>
      </div>

      <div className="video-summary-banner">
        <div>
          <span className="summary-badge"><Film size={19} /></span>
          <div><strong>{videos.filter((v) => v.status === "ready").length}</strong><span>Video hoàn tất</span></div>
        </div>
        <div>
          <span className="summary-badge yellow"><Clock3 size={19} /></span>
          <div><strong>{videos.filter((v) => v.status === "processing").length}</strong><span>Đang xử lý</span></div>
        </div>
        <div className="minutes-created">
          <span>Thời lượng đã tạo</span>
          <strong>28 phút 06 giây</strong>
        </div>
      </div>

      <div className="library-toolbar video-toolbar">
        <label className="search-box">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm video..."
          />
        </label>
        <div className="filter-tabs">
          {[
            ["all", "Tất cả"],
            ["ready", "Hoàn tất"],
            ["processing", "Đang xử lý"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className={filter === value ? "active" : ""}
            >{label}</button>
          ))}
        </div>
        <button className="toolbar-button compact-filter"><Filter size={18} /></button>
      </div>

      <div className="video-grid">
        {filtered.map((video) => (
          <article className="video-card" key={video.id}>
            <div className={`video-thumbnail theme-${video.color} ratio-${video.ratio.replace(":", "-")}`}>
              <div className="thumbnail-brand">LECTURE<span>AI</span></div>
              <div className="thumbnail-content">
                <small>BÀI GIẢNG AI</small>
                <strong>{video.title}</strong>
                <i />
              </div>
              {video.status === "ready" ? (
                <button
                  className="play-button"
                  onClick={() => setPlaying(video)}
                  aria-label="Xem video"
                ><Play size={22} fill="currentColor" /></button>
              ) : (
                <div className="processing-overlay">
                  <span className="spinner large" />
                  <strong>Đang tạo video...</strong>
                  <small>{video.progress ?? 18}%</small>
                </div>
              )}
              {video.status === "ready" && <span className="duration-badge">{video.duration}</span>}
              <span className="ratio-badge">{video.ratio}</span>
            </div>
            <div className="video-info">
              <div className="video-title-row">
                <div>
                  <strong>{video.title}</strong>
                  <p>{video.documentName}</p>
                </div>
                <button className="icon-button"><MoreHorizontal size={20} /></button>
              </div>
              {video.status === "processing" ? (
                <div className="processing-bar">
                  <div><span>Đang dựng hình và lồng tiếng</span><strong>{video.progress ?? 18}%</strong></div>
                  <div className="storage-track"><span style={{ width: `${video.progress ?? 18}%` }} /></div>
                </div>
              ) : (
                <div className="video-actions">
                  <span>{video.createdAt}</span>
                  <div>
                    <button title="Tải xuống"><Download size={17} /></button>
                    <button title="Chia sẻ"><Share2 size={17} /></button>
                    <button title="Xóa" onClick={() => removeVideo(video.id)}><Trash2 size={17} /></button>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <div className="empty-state">
          <span><Film size={28} /></span>
          <h3>Chưa có video phù hợp</h3>
          <p>Tạo video đầu tiên từ một tài liệu PDF của bạn.</p>
          <button className="primary-button" onClick={() => navigate("/app/create")}>
            <Plus size={17} /> Tạo video mới
          </button>
        </div>
      )}

      {playing && (
        <div className="modal-backdrop video-modal-backdrop" onClick={() => setPlaying(null)}>
          <div className="video-player-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPlaying(null)}><X size={20} /></button>
            <div className={`fake-player theme-${playing.color}`}>
              <div className="fake-player-copy">
                <small>LECTUREAI · BÀI GIẢNG</small>
                <strong>{playing.title}</strong>
                <span>{playing.documentName}</span>
              </div>
              <button><Pause size={25} fill="currentColor" /></button>
              <div className="player-controls">
                <span>03:26</span><div><i /></div><span>{playing.duration}</span>
              </div>
            </div>
            <div className="player-meta">
              <div><h3>{playing.title}</h3><p>Tạo từ {playing.documentName}</p></div>
              <button className="secondary-button"><Share2 size={17} /> Chia sẻ</button>
              <button className="primary-button"><Download size={17} /> Tải video</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
