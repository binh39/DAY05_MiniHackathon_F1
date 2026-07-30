import type { DocumentItem, VideoItem } from "./types";

export const seedDocuments: DocumentItem[] = [
  {
    id: "doc-01",
    name: "Lecture-02-Process.pdf",
    size: "4,8 MB",
    pages: 45,
    uploadedAt: "Hôm nay, 09:24",
    status: "ready",
    color: "#7658f6",
  },
  {
    id: "doc-02",
    name: "AI Product Discovery.pdf",
    size: "2,1 MB",
    pages: 28,
    uploadedAt: "29/07/2026",
    status: "ready",
    color: "#12a594",
  },
  {
    id: "doc-03",
    name: "Prompt Engineering Handbook.pdf",
    size: "7,3 MB",
    pages: 62,
    uploadedAt: "27/07/2026",
    status: "ready",
    color: "#f1845b",
  },
  {
    id: "doc-04",
    name: "UX Research Notes.pdf",
    size: "1,6 MB",
    pages: 19,
    uploadedAt: "24/07/2026",
    status: "ready",
    color: "#3e83ea",
  },
];

export const seedVideos: VideoItem[] = [
  {
    id: "video-01",
    title: "Giới thiệu về Tiến trình",
    documentName: "Lecture-02-Process.pdf",
    duration: "15:08",
    ratio: "16:9",
    createdAt: "Hôm nay, 10:02",
    status: "ready",
    color: "violet",
  },
  {
    id: "video-02",
    title: "Tìm đúng pain point cho AI Product",
    documentName: "AI Product Discovery.pdf",
    duration: "07:42",
    ratio: "16:9",
    createdAt: "29/07/2026",
    status: "ready",
    color: "mint",
  },
  {
    id: "video-03",
    title: "5 kỹ thuật Prompt Engineering",
    documentName: "Prompt Engineering Handbook.pdf",
    duration: "05:16",
    ratio: "9:16",
    createdAt: "27/07/2026",
    status: "ready",
    color: "coral",
  },
];
