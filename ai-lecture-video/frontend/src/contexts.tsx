import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedDocuments, seedVideos } from "./data";
import type {
  AspectRatio,
  DocumentItem,
  DurationOption,
  User,
  VideoItem,
} from "./types";

interface AuthContextValue {
  user: User | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "lectureai-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });

  function login(email: string, name = "Minh Anh") {
    const next = { email, name };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  }

  function logout() {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
  file: File;
  title: string;
  ratio: AspectRatio;
  duration: DurationOption;
}

interface LibraryContextValue {
  documents: DocumentItem[];
  videos: VideoItem[];
  createVideo: (input: CreateVideoInput) => string;
  removeDocument: (id: string) => void;
  removeVideo: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);
const DOCUMENTS_KEY = "lectureai-documents";
const VIDEOS_KEY = "lectureai-videos";

function loadItems<T>(key: string, fallback: T[]): T[] {
  const stored = localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as T[]) : fallback;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentItem[]>(() =>
    loadItems(DOCUMENTS_KEY, seedDocuments),
  );
  const [videos, setVideos] = useState<VideoItem[]>(() =>
    loadItems(VIDEOS_KEY, seedVideos),
  );

  useEffect(() => {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }, [documents]);
  useEffect(() => {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  }, [videos]);

  function createVideo(input: CreateVideoInput) {
    const id = `video-${Date.now()}`;
    const documentId = `doc-${Date.now()}`;
    const size = `${(input.file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
    setDocuments((current) => [
      {
        id: documentId,
        name: input.file.name,
        size,
        pages: Math.max(1, Math.round(input.file.size / 75_000)),
        uploadedAt: "Vừa xong",
        status: "ready",
        color: "#7658f6",
      },
      ...current,
    ]);
    setVideos((current) => [
      {
        id,
        title: input.title || input.file.name.replace(/\.pdf$/i, ""),
        documentName: input.file.name,
        duration: input.duration,
        ratio: input.ratio,
        createdAt: "Đang xử lý",
        status: "processing",
        progress: 18,
        color: "blue",
      },
      ...current,
    ]);
    window.setTimeout(() => {
      setVideos((current) =>
        current.map((video) =>
          video.id === id
            ? { ...video, status: "ready", progress: 100, createdAt: "Vừa xong" }
            : video,
        ),
      );
    }, 4500);
    return id;
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((item) => item.id !== id));
  }

  function removeVideo(id: string) {
    setVideos((current) => current.filter((item) => item.id !== id));
  }

  const value = useMemo(
    () => ({
      documents,
      videos,
      createVideo,
      removeDocument,
      removeVideo,
    }),
    [documents, videos],
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
