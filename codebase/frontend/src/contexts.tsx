import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  artifactBlobUrl,
  cancelJob,
  clearArtifactCache,
  createJob,
  deleteJob,
  deleteVideo as deleteVideoRequest,
  getQuota,
  listJobs,
  retryJob,
  startVideoFromDocument,
  uploadDocument,
  type ApiJob,
  type UserQuota,
} from "./api";
import { firebaseAuth, firebaseDb } from "./firebase";
import type {
  AspectRatio,
  DocumentItem,
  DurationOption,
  LanguageCode,
  User,
  VideoItem,
  VisualStyle,
} from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        setUser(
          firebaseUser
            ? {
                uid: firebaseUser.uid,
                email: firebaseUser.email ?? "",
                name:
                  firebaseUser.displayName ??
                  firebaseUser.email?.split("@")[0] ??
                  "Học viên",
              }
            : null,
        );
        setLoading(false);
      }),
    [],
  );

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }

  async function register(name: string, email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    await updateProfile(credential.user, { displayName: name });
    const now = new Date().toISOString();
    await setDoc(doc(firebaseDb, "users", credential.user.uid), {
      uid: credential.user.uid,
      email,
      display_name: name,
      created_at: now,
      updated_at: now,
    });
    await credential.user.reload();
    setUser({ uid: credential.user.uid, email, name });
  }

  async function logout() {
    clearArtifactCache();
    await signOut(firebaseAuth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(firebaseAuth, email);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

interface CreateVideoInput {
  file?: File;
  documentId?: string;
  documentName: string;
  documentSizeBytes: number;
  title: string;
  ratio: AspectRatio;
  duration: DurationOption;
  language: LanguageCode;
  voiceId: string;
  visualStyle: VisualStyle;
  onUploadProgress?: (percent: number) => void;
}

interface LibraryContextValue {
  documents: DocumentItem[];
  videos: VideoItem[];
  createVideo: (input: CreateVideoInput) => Promise<string>;
  saveDocument: (
    file: File,
    onUploadProgress?: (percent: number) => void,
  ) => Promise<string>;
  retryVideo: (jobId: string) => Promise<void>;
  cancelVideo: (jobId: string) => Promise<void>;
  deleteLibraryJob: (jobId: string) => Promise<void>;
  deleteVideo: (jobId: string) => Promise<void>;
  quota: UserQuota | null;
  refreshQuota: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function documentFingerprint(name: string, sizeBytes: number): string {
  return `${name.trim().toLocaleLowerCase("vi-VN")}::${sizeBytes}`;
}

function hasCompletedDocumentAnalysis(job: ApiJob): boolean {
  return (
    job.stage === "DOCUMENT_READY" ||
    job.modules?.module1_document_intelligence.status === "COMPLETED"
  );
}

function documentJobPriority(job: ApiJob): number {
  const isActive =
    job.status === "QUEUED" ||
    job.status === "RUNNING" ||
    job.status === "AWAITING_APPROVAL";
  if (job.kind === "VIDEO" && isActive) return 60;
  if (job.kind === "VIDEO" && job.status === "COMPLETED") return 50;
  if (job.kind === "DOCUMENT" && hasCompletedDocumentAnalysis(job)) return 40;
  if (job.kind === "DOCUMENT" && isActive) return 30;
  if (job.kind === "VIDEO" && job.status === "FAILED") return 20;
  return 10;
}

function groupDocumentJobs(jobs: ApiJob[]): Array<{
  representative: ApiJob;
  summaryJob?: ApiJob;
  sourceJob: ApiJob;
  pages?: number;
}> {
  const groups = new Map<string, ApiJob[]>();
  for (const job of jobs) {
    const key = documentFingerprint(
      job.original_filename,
      job.input_size_bytes,
    );
    const group = groups.get(key);
    if (group) group.push(job);
    else groups.set(key, [job]);
  }

  return [...groups.values()]
    .map((group) => {
      const representative = group.reduce((selected, candidate) => {
        const selectedPriority = documentJobPriority(selected);
        const candidatePriority = documentJobPriority(candidate);
        if (candidatePriority !== selectedPriority) {
          return candidatePriority > selectedPriority ? candidate : selected;
        }
        return candidate.created_at > selected.created_at ? candidate : selected;
      });
      const sourceJob = [...group].sort((left, right) =>
        left.created_at.localeCompare(right.created_at),
      )[0]!;
      const summaryJob =
        group.find(
          (job) =>
            job.kind === "DOCUMENT" && hasCompletedDocumentAnalysis(job),
        ) ?? group.find(hasCompletedDocumentAnalysis);
      const pages =
        representative.document_pages ??
        summaryJob?.document_pages ??
        group.find((job) => job.document_pages)?.document_pages;
      return { representative, summaryJob, sourceJob, pages };
    })
    .sort((left, right) =>
      right.representative.updated_at.localeCompare(
        left.representative.updated_at,
      ),
    );
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [quota, setQuota] = useState<UserQuota | null>(null);

  useEffect(() => {
    localStorage.removeItem("lectureai-documents");
    localStorage.removeItem("lectureai-videos");
  }, []);

  async function mergeApiJobs(jobs: ApiJob[]) {
    const remoteVideos: VideoItem[] = await Promise.all(
      jobs.filter((job) => job.kind !== "DOCUMENT").map(async (job) => ({
        id: `job-${job.id}`,
        title: job.fields.title || job.original_filename.replace(/\.pdf$/i, ""),
        documentName: job.original_filename,
        duration: `${job.fields.duration_option.replace("-", "–")} phút`,
        ratio: job.fields.aspect_ratio,
        createdAt:
          job.status === "COMPLETED"
            ? new Date(job.updated_at).toLocaleString("vi-VN")
            : job.status === "FAILED"
              ? "Xử lý thất bại"
              : "Đang xử lý",
        status:
          job.status === "COMPLETED"
            ? "ready"
            : job.status === "AWAITING_APPROVAL"
              ? "review"
            : job.status === "FAILED" || job.status === "CANCELLED"
              ? "failed"
              : "processing",
        progress: job.progress,
        color: "blue",
        error: job.error,
        videoUrl: job.artifacts?.video
          ? await artifactBlobUrl(job.artifacts.video)
          : undefined,
        subtitleUrl: job.artifacts?.subtitle
          ? await artifactBlobUrl(job.artifacts.subtitle)
          : undefined,
        coverageUrl: job.artifacts?.coverage
          ? await artifactBlobUrl(job.artifacts.coverage)
          : undefined,
        thumbnailUrl: job.artifacts?.thumbnail
          ? await artifactBlobUrl(job.artifacts.thumbnail)
          : undefined,
        jobId: job.id,
        stage: job.stage,
        durationSeconds: job.result_duration_seconds,
        hasFeedback: job.has_feedback,
        modules: job.modules,
        failedModule: job.retry_from ?? job.failed_module,
      })),
    );
    const remoteDocuments: DocumentItem[] = groupDocumentJobs(jobs).map(
      ({ representative: job, summaryJob, sourceJob, pages }) => {
      const isDocumentReady =
        job.kind === "DOCUMENT" &&
        hasCompletedDocumentAnalysis(job);
      const hasVideoJob = job.kind === "VIDEO";
      return {
        id: `job-doc-${job.id}`,
        jobId: job.id,
        summaryJobId: summaryJob?.id,
        name: job.original_filename,
        size: `${(job.input_size_bytes / 1024 / 1024)
          .toFixed(1)
          .replace(".", ",")} MB`,
        sizeBytes: job.input_size_bytes,
        pages,
        uploadedAt: new Date(sourceJob.created_at).toLocaleString("vi-VN"),
        status: isDocumentReady ? "ready" : hasVideoJob ? "video" : "analyzing",
        progress: isDocumentReady
          ? 100
          : hasVideoJob
            ? Math.max(0, Math.min(100, job.progress))
            : Math.max(0, Math.min(99, job.progress)),
        stage: job.stage,
        color: "#40c2fd",
      };
      },
    );
    setVideos(remoteVideos);
    setDocuments(remoteDocuments);
  }

  useEffect(() => {
    if (authLoading || !user) {
      setVideos([]);
      setDocuments([]);
      setQuota(null);
      return;
    }
    let stopped = false;
    async function refresh() {
      try {
        const [jobs, latestQuota] = await Promise.all([listJobs(), getQuota()]);
        if (!stopped) {
          await mergeApiJobs(jobs);
          setQuota(latestQuota);
        }
      } catch {
        // Backend availability is surfaced when the user submits a job.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1_500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [authLoading, user?.uid]);

  async function createVideo(input: CreateVideoInput) {
    const job = input.documentId
      ? await startVideoFromDocument(input.documentId, input)
      : await createJob(
          {
            ...input,
            file: input.file!,
          },
          input.onUploadProgress,
        );
    const id = `job-${job.id}`;
    const documentId = `job-doc-${job.id}`;
    const size = `${(input.documentSizeBytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
    setDocuments((current) => {
      const fingerprint = documentFingerprint(
        input.documentName,
        input.documentSizeBytes,
      );
      const existingDocument = current.find(
        (item) => documentFingerprint(item.name, item.sizeBytes) === fingerprint,
      );
      const document: DocumentItem = {
        id: documentId,
        jobId: job.id,
        summaryJobId:
          existingDocument?.summaryJobId ??
          input.documentId ??
          existingDocument?.jobId,
        name: input.documentName,
        size,
        sizeBytes: input.documentSizeBytes,
        uploadedAt: "Vừa xong",
        status: "video",
        progress: job.progress,
        stage: job.stage,
        color: "#40c2fd",
      };
      return [
        document,
        ...current.filter(
          (item) =>
            item.id !== documentId &&
            documentFingerprint(item.name, item.sizeBytes) !== fingerprint,
        ),
      ];
    });
    setVideos((current) => {
      const video: VideoItem = {
        id,
        title: input.title || input.documentName.replace(/\.pdf$/i, ""),
        documentName: input.documentName,
        duration: input.duration,
        ratio: input.ratio,
        createdAt: "Đang xử lý",
        status: "processing",
        progress: job.progress,
        color: "blue",
        jobId: job.id,
        stage: job.stage,
      };
      return [video, ...current.filter((item) => item.id !== id)];
    });
    setQuota(await getQuota());
    return id;
  }

  async function saveDocument(
    file: File,
    onUploadProgress?: (percent: number) => void,
  ) {
    const job = await uploadDocument(file, onUploadProgress);
    await mergeApiJobs(await listJobs());
    setQuota(await getQuota());
    return job.id;
  }

  async function retryVideo(jobId: string) {
    await retryJob(jobId);
    await mergeApiJobs(await listJobs());
  }

  async function cancelVideo(jobId: string) {
    await cancelJob(jobId);
    await mergeApiJobs(await listJobs());
  }

  async function deleteLibraryJob(jobId: string) {
    await deleteJob(jobId);
    clearArtifactCache();
    await mergeApiJobs(await listJobs());
    setQuota(await getQuota());
  }

  async function deleteVideo(jobId: string) {
    await deleteVideoRequest(jobId);
    clearArtifactCache();
    await mergeApiJobs(await listJobs());
    setQuota(await getQuota());
  }

  async function refreshQuota() {
    setQuota(await getQuota());
  }

  const value = useMemo(
    () => ({
      documents,
      videos,
      createVideo,
      saveDocument,
      retryVideo,
      cancelVideo,
      deleteLibraryJob,
      deleteVideo,
      quota,
      refreshQuota,
    }),
    [documents, videos, quota],
  );
  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}
