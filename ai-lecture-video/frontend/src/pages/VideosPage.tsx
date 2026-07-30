import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleX,
  Clock3,
  Download,
  Film,
  ListChecks,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  artifactBlobUrl,
  getResult,
  type ResultDetail,
} from "../api";
import { useLibrary } from "../contexts";
import { useNavigate, useRouter } from "../router";
import type { VideoItem } from "../types";
import type {
  PipelineModuleId,
  PipelineModuleStates,
} from "../types";

function formatTimestamp(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}

const moduleLabels: Record<PipelineModuleId, string> = {
  module1_document_intelligence: "1 · Phân tích PDF",
  module2_lecture_planner: "2 · Lập outline",
  module3_script_generator: "3 · Viết kịch bản",
  module4_storyboard_generator: "4 · Storyboard",
  module5a_visual_generator: "5A · Hình ảnh",
  module5b_voice_generator: "5B · Giọng đọc",
  module6_video_composer: "6 · Ghép video",
};

function stageLabel(stage?: string): string {
  const labels: Record<string, string> = {
    QUEUED: "Đang chờ xử lý",
    QUEUED_AFTER_APPROVAL: "Đang chờ tiếp tục từ Module 3",
    QUEUED_FOR_MODULE_RETRY: "Đang chờ chạy lại module lỗi",
    STARTING: "Đang khởi động pipeline",
    ANALYZING_DOCUMENT: "Module 1 đang phân tích PDF",
    PLANNING_LECTURE: "Module 2 đang lập outline",
    GENERATING_SCRIPT: "Module 3 đang viết kịch bản",
    GENERATING_STORYBOARD: "Module 4 đang tạo storyboard",
    GENERATING_VISUALS: "Module 5A đang tạo hình ảnh",
    GENERATING_VOICE: "Module 5B đang tạo giọng đọc",
    GENERATING_ASSETS_PARALLEL: "Module 5A và 5B đang chạy song song",
    COMPOSING_VIDEO: "Module 6 đang ghép video",
  };
  return labels[stage ?? ""] ?? "Đang xử lý pipeline";
}

function ModuleProgress({ modules }: { modules: PipelineModuleStates }) {
  function item(module: PipelineModuleId) {
    const state = modules[module];
    return (
      <div className={`pipeline-module ${state.status.toLowerCase()}`} key={module}>
        <span>
          {state.status === "COMPLETED"
            ? "✓"
            : state.status === "RUNNING"
              ? "●"
              : state.status === "FAILED"
                ? "!"
                : "○"}
        </span>
        <strong>{moduleLabels[module]}</strong>
      </div>
    );
  }
  return (
    <div className="pipeline-module-list">
      {item("module1_document_intelligence")}
      {item("module2_lecture_planner")}
      {item("module3_script_generator")}
      {item("module4_storyboard_generator")}
      <div className="parallel-module-pair">
        {item("module5a_visual_generator")}
        {item("module5b_voice_generator")}
      </div>
      {item("module6_video_composer")}
    </div>
  );
}

export function VideosPage() {
  const { videos, retryVideo, cancelVideo, deleteLibraryJob } = useLibrary();
  const navigate = useNavigate();
  const location = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "ready" | "processing" | "review" | "failed"
  >("all");
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");
  const [activeChapterId, setActiveChapterId] = useState("");
  const [sourcePage, setSourcePage] = useState<{
    page: number;
    imageUrl: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [toast, setToast] = useState(
    Boolean(
      (location.state as { created?: boolean; approved?: boolean } | null)
        ?.created ||
      (location.state as { created?: boolean; approved?: boolean } | null)
        ?.approved,
    ),
  );
  const approved = Boolean(
    (location.state as { approved?: boolean } | null)?.approved,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let stopped = false;
    setResult(null);
    setResultError("");
    setSourcePage(null);
    if (!playing?.jobId || playing.status !== "ready") return;
    setResultLoading(true);
    void getResult(playing.jobId)
      .then((detail) => {
        if (stopped) return;
        setResult(detail);
        setActiveChapterId(detail.chapters[0]?.chapter_id ?? "");
      })
      .catch((error: unknown) => {
        if (!stopped) {
          setResultError(
            error instanceof Error
              ? error.message
              : "Không thể tải thông tin chapter.",
          );
        }
      })
      .finally(() => {
        if (!stopped) setResultLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [playing?.jobId, playing?.status]);

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
  const activeChapter = useMemo(
    () =>
      result?.chapters.find(
        (chapter) => chapter.chapter_id === activeChapterId,
      ) ?? result?.chapters[0],
    [activeChapterId, result],
  );
  function seekToChapter(chapter: ResultDetail["chapters"][number]) {
    setActiveChapterId(chapter.chapter_id);
    if (videoRef.current) {
      videoRef.current.currentTime = chapter.start_seconds;
      void videoRef.current.play();
    }
  }

  function updateActiveChapter() {
    const current = videoRef.current?.currentTime;
    if (current === undefined || !result) return;
    const chapter = [...result.chapters]
      .reverse()
      .find((item) => current >= item.start_seconds);
    if (chapter) setActiveChapterId(chapter.chapter_id);
  }

  async function showSourcePage(pageNumber: number) {
    const page = result?.pages.find((item) => item.page === pageNumber);
    if (!page) return;
    try {
      setResultError("");
      setSourcePage({
        page: pageNumber,
        imageUrl: await artifactBlobUrl(page.image_url),
      });
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Không thể tải trang nguồn.",
      );
    }
  }

  async function removeVideo(video: VideoItem) {
    if (
      !video.jobId ||
      !window.confirm(
        `Xóa "${video.title}" cùng PDF và toàn bộ artifact liên quan? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    try {
      setDeleteError("");
      if (playing?.jobId === video.jobId) setPlaying(null);
      await deleteLibraryJob(video.jobId);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Không thể xóa video.",
      );
    }
  }

  return (
    <div className="library-page videos-page page-enter">
      {toast && (
        <div className="success-toast">
          <CheckCircle2 size={20} />
          <div>
            <strong>
              {approved ? "Outline đã được duyệt" : "Tài liệu đã được đưa vào hàng chờ"}
            </strong>
            <span>
              {approved
                ? "Pipeline đang tiếp tục từ Module 3."
                : "AI sẽ phân tích và gửi outline để bạn duyệt trước."}
            </span>
          </div>
          <button onClick={() => setToast(false)}><X size={17} /></button>
        </div>
      )}
      <div className="page-heading library-heading">
        <div>
          <h1>Video của tôi</h1>
          <p>Xem, chia sẻ và tải xuống những video bạn đã tạo.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/app/create")}>
          <Plus size={18} /> Tạo video mới
        </button>
      </div>

      <div className="video-summary-banner unified-library-bar">
        <div>
          <span className="summary-badge"><Film size={19} /></span>
          <div><strong>{videos.filter((v) => v.status === "ready").length}</strong><span>Video hoàn tất</span></div>
        </div>
        <div>
          <span className="summary-badge yellow"><Clock3 size={19} /></span>
          <div><strong>{videos.filter((v) => v.status === "processing").length}</strong><span>Đang xử lý</span></div>
        </div>
        <div>
          <span className="summary-badge purple"><ListChecks size={19} /></span>
          <div><strong>{videos.filter((v) => v.status === "review").length}</strong><span>Chờ duyệt</span></div>
        </div>
        <div className="library-toolbar unified-library-toolbar">
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
              ["review", "Chờ duyệt"],
              ["failed", "Lỗi"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as typeof filter)}
                className={filter === value ? "active" : ""}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>
      {deleteError && <p className="library-error">{deleteError}</p>}

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
              ) : video.status === "review" ? (
                <div className="processing-overlay review-overlay">
                  <ListChecks size={30} />
                  <strong>Outline đã sẵn sàng</strong>
                  <small>Kiểm tra chapter trước khi tạo video.</small>
                  {video.jobId && (
                    <button
                      className="review-button"
                      onClick={() => navigate(`/app/outline/${video.jobId}`)}
                    >
                      Xem và duyệt outline
                    </button>
                  )}
                </div>
              ) : video.status === "failed" ? (
                <div className="processing-overlay failed-overlay">
                  <CircleX size={30} />
                  <strong>Xử lý chưa thành công</strong>
                  <small>{video.error ?? "Pipeline đã dừng."}</small>
                  {video.failedModule && (
                    <small>
                      Có thể tiếp tục từ {moduleLabels[
                        video.failedModule as PipelineModuleId
                      ] ?? video.failedModule}.
                    </small>
                  )}
                  {video.jobId && (
                    <button
                      className="retry-button"
                      onClick={() => void retryVideo(video.jobId!)}
                    >
                      {video.failedModule ? "Tiếp tục từ module lỗi" : "Thử lại"}
                    </button>
                  )}
                </div>
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
                {video.status !== "processing" && video.jobId && (
                  <button
                    className="delete-library-button"
                    onClick={() => void removeVideo(video)}
                    aria-label={`Xóa ${video.title}`}
                    title="Xóa job và toàn bộ artifact"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {video.status === "review" ? (
                <div className="review-meta">
                  <span>Module 1–2 hoàn tất · Đang chờ quyết định của bạn</span>
                  {video.jobId && (
                    <button onClick={() => navigate(`/app/outline/${video.jobId}`)}>
                      Duyệt outline
                    </button>
                  )}
                </div>
              ) : video.status === "processing" ? (
                <div className="processing-bar">
                  <div>
                    <span>{stageLabel(video.stage)}</span>
                    <strong>{video.progress ?? 18}%</strong>
                  </div>
                  <div className="storage-track"><span style={{ width: `${video.progress ?? 18}%` }} /></div>
                  {video.modules && <ModuleProgress modules={video.modules} />}
                  {video.jobId && (
                    <button
                      className="cancel-job-button"
                      onClick={() => void cancelVideo(video.jobId!)}
                    >
                      Hủy xử lý
                    </button>
                  )}
                </div>
              ) : video.status === "ready" ? (
                <div className="video-actions">
                  <span>{video.createdAt}</span>
                  <div>
                    {video.videoUrl && (
                      <a href={video.videoUrl} title="Tải xuống"><Download size={17} /></a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="failed-meta">
                  <span>Cần kiểm tra lỗi pipeline trước khi thử lại.</span>
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
            {playing.videoUrl ? (
              <video
                ref={videoRef}
                className="real-player"
                controls
                autoPlay
                src={playing.videoUrl}
                onTimeUpdate={updateActiveChapter}
              />
            ) : (
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
            )}
            {playing.jobId && (
              <div className="result-learning-panel">
                {resultLoading ? (
                  <div className="result-panel-state">
                    <span className="spinner" /> Đang tải chapter và nguồn...
                  </div>
                ) : resultError && !result ? (
                  <div className="result-panel-state error">
                    <AlertTriangle size={17} /> {resultError}
                  </div>
                ) : result ? (
                  <>
                    <div className="result-panel-grid">
                      <aside className="chapter-navigation">
                        <div className="result-panel-title">
                          <ListChecks size={16} />
                          <strong>Nội dung video</strong>
                        </div>
                        <div className="chapter-navigation-list">
                          {result.chapters.map((chapter, index) => (
                            <button
                              key={chapter.chapter_id}
                              className={
                                chapter.chapter_id === activeChapter?.chapter_id
                                  ? "active"
                                  : ""
                              }
                              onClick={() => seekToChapter(chapter)}
                            >
                              <span>{index + 1}</span>
                              <div>
                                <strong>{chapter.title}</strong>
                                <small>
                                  {formatTimestamp(chapter.start_seconds)} · Trang{" "}
                                  {chapter.page_numbers.join(", ")}
                                </small>
                              </div>
                              <Play size={13} fill="currentColor" />
                            </button>
                          ))}
                        </div>
                      </aside>
                      <section className="source-navigation">
                        <div className="result-panel-title">
                          <BookOpen size={16} />
                          <strong>Nguồn của chapter</strong>
                        </div>
                        {activeChapter ? (
                          <>
                            <p className="chapter-objective">
                              {activeChapter.learning_objectives.join(" · ")}
                            </p>
                            <div className="source-chip-list">
                              {[...new Map(
                                activeChapter.sources.map((source) => [
                                  source.page,
                                  source,
                                ]),
                              ).values()].map((source) => (
                                <button
                                  key={source.page}
                                  className={
                                    sourcePage?.page === source.page
                                      ? "active"
                                      : ""
                                  }
                                  onClick={() => void showSourcePage(source.page)}
                                >
                                  Trang {source.page}
                                  <small>{source.element_type}</small>
                                </button>
                              ))}
                            </div>
                            {sourcePage ? (
                              <div className="source-page-preview">
                                <img
                                  src={sourcePage.imageUrl}
                                  alt={`Trang nguồn ${sourcePage.page}`}
                                />
                                <div>
                                  <strong>Trang {sourcePage.page}</strong>
                                  <p>
                                    {result.pages.find(
                                      (page) => page.page === sourcePage.page,
                                    )?.summary}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="source-empty">
                                Chọn một trang để đối chiếu trực tiếp với PDF.
                              </div>
                            )}
                            {resultError && (
                              <p className="source-error">{resultError}</p>
                            )}
                          </>
                        ) : (
                          <div className="source-empty">
                            Video chưa có chapter timestamp.
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                ) : null}
              </div>
            )}
            {/* Feedback panel removed from the streamlined video viewer.
              <form className="video-feedback-panel" onSubmit={submitFeedback}>
                <div className="feedback-heading">
                  <span><MessageSquareText size={18} /></span>
                  <div>
                    <strong>
                      {hasSavedFeedback
                        ? "Cập nhật phản hồi của bạn"
                        : "Video này hữu ích đến đâu?"}
                    </strong>
                    <p>Phản hồi được lưu cùng job để cải thiện chất lượng bài giảng.</p>
                  </div>
                </div>
                <div className="feedback-grid">
                  <div className="feedback-field rating-field">
                    <label>Đánh giá tổng thể</label>
                    <div className="star-rating">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          className={
                            rating <= feedback.overall_rating ? "active" : ""
                          }
                          onClick={() =>
                            setFeedback((current) => ({
                              ...current,
                              overall_rating: rating,
                            }))
                          }
                          aria-label={`${rating} sao`}
                        >
                          <Star size={19} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="feedback-field">
                    Độ chính xác nội dung
                    <select
                      value={feedback.content_accuracy}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          content_accuracy: event.target
                            .value as FeedbackInput["content_accuracy"],
                        }))
                      }
                    >
                      <option value="ACCURATE">Chính xác</option>
                      <option value="MINOR_ISSUE">Có lỗi nhỏ</option>
                      <option value="INCORRECT">Có nội dung sai</option>
                      <option value="UNSURE">Tôi không chắc</option>
                    </select>
                  </label>
                  <label className="feedback-field">
                    Mức độ dễ hiểu
                    <select
                      value={feedback.clarity_rating}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          clarity_rating: Number(event.target.value),
                        }))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option value={rating} key={rating}>
                          {rating}/5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="feedback-field">
                    Thời lượng
                    <select
                      value={feedback.duration_fit}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          duration_fit: event.target
                            .value as FeedbackInput["duration_fit"],
                        }))
                      }
                    >
                      <option value="TOO_SHORT">Quá ngắn</option>
                      <option value="JUST_RIGHT">Vừa đủ</option>
                      <option value="TOO_LONG">Quá dài</option>
                    </select>
                  </label>
                </div>
                <div className="feedback-choice">
                  <span>Bạn có muốn dùng video kiểu này cho tài liệu tiếp theo?</span>
                  <div>
                    <button
                      type="button"
                      className={feedback.would_use_again ? "active" : ""}
                      onClick={() =>
                        setFeedback((current) => ({
                          ...current,
                          would_use_again: true,
                        }))
                      }
                    >
                      Có
                    </button>
                    <button
                      type="button"
                      className={!feedback.would_use_again ? "active" : ""}
                      onClick={() =>
                        setFeedback((current) => ({
                          ...current,
                          would_use_again: false,
                        }))
                      }
                    >
                      Không
                    </button>
                  </div>
                </div>
                <label className="feedback-text">
                  Phần nào khó hiểu hoặc sai?
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={feedback.issue_details ?? ""}
                    onChange={(event) =>
                      setFeedback((current) => ({
                        ...current,
                        issue_details: event.target.value,
                      }))
                    }
                    placeholder="Ghi chapter, timestamp hoặc nội dung cần xem lại..."
                  />
                </label>
                <label className="feedback-text">
                  Góp ý thêm
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={feedback.comment ?? ""}
                    onChange={(event) =>
                      setFeedback((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="Điều gì sẽ khiến video hữu ích hơn?"
                  />
                </label>
                <div className="feedback-actions">
                  {feedbackMessage && <span>{feedbackMessage}</span>}
                  <button
                    className="primary-button"
                    disabled={feedbackSaving}
                  >
                    {feedbackSaving
                      ? "Đang lưu..."
                      : hasSavedFeedback
                        ? "Cập nhật phản hồi"
                        : "Gửi phản hồi"}
                  </button>
                </div>
              </form>
            */}
            <div className="player-meta">
              <div><h3>{playing.title}</h3><p>Tạo từ {playing.documentName}</p></div>
              {playing.videoUrl ? (
                <a className="primary-button" href={playing.videoUrl}>
                  <Download size={17} /> Tải video
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
