import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  documentBlobUrl,
  generateDocumentSummary,
  type SummaryArtifact,
} from "../api";
import { useLibrary } from "../contexts";
import { useNavigate, useRouter } from "../router";

export function DocumentSummaryPage() {
  const { pathname } = useRouter();
  const navigate = useNavigate();
  const { documents } = useLibrary();
  const documentId = pathname.split("/")[3] ?? "";
  const document = documents.find((item) => item.jobId === documentId);
  const [pdfUrl, setPdfUrl] = useState("");
  const [summary, setSummary] = useState<SummaryArtifact | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="document-summary-page">
      <header className="document-summary-header">
        <button onClick={() => navigate("/app/documents")}>
          <ArrowLeft size={19} /> Quay lại
        </button>
        <div>
          <FileText size={19} />
          <strong>{document?.name ?? "Tài liệu PDF"}</strong>
        </div>
      </header>
      <div className="document-summary-split">
        <section className="pdf-reading-pane">
          {pdfUrl ? (
            <iframe src={pdfUrl} title={`PDF ${document?.name ?? ""}`} />
          ) : (
            <div className="summary-loading">
              <span className="spinner" /> Đang tải PDF...
            </div>
          )}
        </section>
        <article className="summary-reading-pane">
          <div className="summary-pane-title">
            <span><Sparkles size={20} /></span>
            <div>
              <small>TÓM TẮT BẰNG AI</small>
              <h1>{summary?.title ?? "Đang tạo bản tóm tắt..."}</h1>
            </div>
          </div>
          {error ? (
            <div className="summary-error">{error}</div>
          ) : !summary ? (
            <div className="summary-loading">
              <span className="spinner" />
              Gemini đang tổng hợp nội dung từ kết quả phân tích tài liệu...
            </div>
          ) : (
            <div className="summary-content">
              <section>
                <h2>Tổng quan</h2>
                <p>{summary.overview}</p>
              </section>
              {summary.key_points.map((point, index) => (
                <section key={`${point.heading}-${index}`}>
                  <h2>{point.heading}</h2>
                  <p>{point.content}</p>
                  <small>
                    Nguồn: trang {point.source_pages.join(", ")}
                  </small>
                </section>
              ))}
              <section className="summary-conclusion">
                <h2>Kết luận</h2>
                <p>{summary.conclusion}</p>
              </section>
              {summary.warnings.length > 0 && (
                <aside>
                  <strong>Lưu ý</strong>
                  {summary.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </aside>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
