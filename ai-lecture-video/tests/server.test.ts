import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createServer } from "../src/server/app.js";
import type { FirebaseServices } from "../src/server/firebase-services.js";
import type { JobRecord } from "../src/server/types.js";

function multipartPayload(options: {
  filename: string;
  mimetype: string;
  file: Buffer;
  fields?: Record<string, string>;
}) {
  const boundary = "----lectureai-test-boundary";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(options.fields ?? {})) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${options.filename}"\r\nContent-Type: ${options.mimetype}\r\n\r\n`,
    ),
    options.file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return {
    payload: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-server-"),
  );
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  return directory;
}

test("health endpoint is available and starts with an empty queue", async (t) => {
  const directory = await temporaryDirectory(t);
  const jobsDirectory = path.join(directory, "backend", "jobs");
  await mkdir(jobsDirectory, { recursive: true });
  await writeFile(
    path.join(jobsDirectory, "pipeline.config.json"),
    '{"input_pdf":"fixture.pdf"}',
    "utf8",
  );
  const server = await createServer(directory, {
    backendDirectory: path.join(directory, "backend"),
    autoRunJobs: false,
  });
  t.after(() => server.close());
  const response = await server.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    queue_length: 0,
    active_job: null,
  });
});

test("upload API rejects a file without PDF magic bytes", async (t) => {
  const directory = await temporaryDirectory(t);
  const server = await createServer(directory, {
    backendDirectory: path.join(directory, "backend"),
    autoRunJobs: false,
  });
  t.after(() => server.close());
  const body = multipartPayload({
    filename: "fake.pdf",
    mimetype: "application/pdf",
    file: Buffer.from("not a real pdf"),
  });
  const response = await server.inject({
    method: "POST",
    url: "/api/jobs",
    headers: { "content-type": body.contentType },
    payload: body.payload,
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "INVALID_JOB_REQUEST");
});

test("creates and persists a queued PDF job without exposing local paths", async (t) => {
  const directory = await temporaryDirectory(t);
  const server = await createServer(directory, {
    backendDirectory: path.join(directory, "backend"),
    autoRunJobs: false,
  });
  t.after(() => server.close());
  const body = multipartPayload({
    filename: "lecture.pdf",
    mimetype: "application/pdf",
    file: Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
    ),
    fields: {
      title: "Lecture test",
      aspect_ratio: "9:16",
      duration_option: "1-3",
      language: "vi",
      voice_id: "vi-VN-Neural2-A",
    },
  });
  const response = await server.inject({
    method: "POST",
    url: "/api/jobs",
    headers: { "content-type": body.contentType },
    payload: body.payload,
  });
  assert.equal(response.statusCode, 202);
  const created = response.json();
  assert.equal(created.status, "QUEUED");
  assert.equal(created.fields.aspect_ratio, "9:16");
  assert.equal(created.fields.duration_option, "1-3");
  assert.equal("input_file" in created, false);
  assert.match(created.status_url, /^\/api\/jobs\//);

  const list = await server.inject({ method: "GET", url: "/api/jobs" });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().jobs.length, 1);
  assert.equal(list.json().jobs[0].id, created.id);
});

test("requires Firebase auth and isolates jobs by owner", async (t) => {
  const directory = await temporaryDirectory(t);
  const persisted: JobRecord[] = [];
  const firebase: FirebaseServices = {
    async verifyIdToken(token) {
      if (token === "alice-token") {
        return { uid: "alice", email: "alice@example.com" };
      }
      if (token === "bob-token") {
        return { uid: "bob", email: "bob@example.com" };
      }
      throw new Error("invalid token");
    },
    async persistJob(job) {
      persisted.push(job);
    },
    async uploadInput(job) {
      return `gs://test/users/${job.owner_uid}/jobs/${job.id}/input.pdf`;
    },
    async uploadArtifacts() {
      return {};
    },
  };
  const server = await createServer(directory, {
    backendDirectory: path.join(directory, "backend"),
    autoRunJobs: false,
    authRequired: true,
    firebaseServices: firebase,
  });
  t.after(() => server.close());

  const unauthenticated = await server.inject({
    method: "GET",
    url: "/api/jobs",
  });
  assert.equal(unauthenticated.statusCode, 401);

  for (const [token, title] of [
    ["alice-token", "Alice lecture"],
    ["bob-token", "Bob lecture"],
  ] as const) {
    const body = multipartPayload({
      filename: `${title}.pdf`,
      mimetype: "application/pdf",
      file: Buffer.from("%PDF-1.4\n%%EOF"),
      fields: { title },
    });
    const response = await server.inject({
      method: "POST",
      url: "/api/jobs",
      headers: {
        "content-type": body.contentType,
        authorization: `Bearer ${token}`,
      },
      payload: body.payload,
    });
    assert.equal(response.statusCode, 202);
  }

  const aliceJobs = await server.inject({
    method: "GET",
    url: "/api/jobs",
    headers: { authorization: "Bearer alice-token" },
  });
  assert.equal(aliceJobs.statusCode, 200);
  assert.equal(aliceJobs.json().jobs.length, 1);
  assert.equal(aliceJobs.json().jobs[0].fields.title, "Alice lecture");
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0]?.owner_uid, "alice");
  assert.equal("input_file" in aliceJobs.json().jobs[0], false);
});

test("loads, edits and approves an outline before continuing the pipeline", async (t) => {
  const directory = await temporaryDirectory(t);
  const backendDirectory = path.join(directory, "backend");
  const runDirectory = path.join(directory, "runs", "outline-job");
  const assetsDirectory = path.join(runDirectory, "assets", "pages");
  await mkdir(path.join(backendDirectory, "jobs"), { recursive: true });
  await mkdir(assetsDirectory, { recursive: true });
  const thumbnailPath = path.join(assetsDirectory, "page-001-thumb.png");
  await writeFile(thumbnailPath, Buffer.from("png fixture"));
  const document = {
    schema_version: "1.0",
    title: "Tài liệu kiểm thử",
    source_file: "input.pdf",
    source_sha256: "a".repeat(64),
    source_size_bytes: 100,
    language: "vi",
    total_pages: 1,
    sources: [
      {
        source_id: "src-1",
        page: 1,
        element_type: "TEXT",
        excerpt: "Nội dung",
        confidence: 1,
      },
    ],
    pages: [
      {
        page: 1,
        summary: "Nội dung",
        concepts: ["Khái niệm"],
        source_ids: ["src-1"],
        warnings: [],
        assets: {
          page_image_path: path.join(assetsDirectory, "page-001.png"),
          thumbnail_path: thumbnailPath,
          width: 100,
          height: 100,
          thumbnail_width: 50,
          thumbnail_height: 50,
        },
      },
    ],
    sections: [
      {
        section_id: "section-1",
        title: "Phần một",
        concepts: ["Khái niệm"],
        source_ids: ["src-1"],
      },
    ],
    warnings: [],
  };
  const plan = {
    schema_version: "1.0",
    title: "Bài giảng gốc",
    coverage_mode: "FULL",
    audience: "beginner",
    language: "vi",
    estimated_duration_seconds: 48,
    learning_objectives: ["Hiểu khái niệm"],
    chapters: [
      {
        chapter_id: "chapter-1",
        title: "Chapter gốc",
        learning_objectives: ["Hiểu khái niệm"],
        duration_seconds: 48,
        source_ids: ["src-1"],
        page_numbers: [1],
        items: [
          {
            item_id: "item-1",
            title: "Khái niệm",
            treatment: "EXPLAIN",
            reason: "Nội dung chính",
            source_ids: ["src-1"],
            page_numbers: [1],
            estimated_narration_words: 60,
            duration_seconds: 30,
          },
        ],
      },
    ],
    coverage: {
      total_pages: 1,
      total_sources: 1,
      accounted_pages: [1],
      accounted_source_ids: ["src-1"],
      covered_pages: [1],
      reference_pages: [],
      unreadable_pages: [],
      duplicate_pages: [],
      coverage_rate: 1,
    },
    warnings: [],
  };
  const config = {
    input_pdf: "input.pdf",
    output_directory: "outputs",
    coverage_mode: "FULL",
    audience: "beginner",
    language: "vi",
    detail_level: "standard",
    max_chapter_minutes: 8,
    limits: { max_pdf_megabytes: 50, max_pdf_pages: 80 },
    voice: {
      provider: "google",
      voice_id: "vi-VN-Neural2-A",
      speaking_rate: 1,
    },
    render: { width: 1920, height: 1080, fps: 30 },
  };
  await Promise.all([
    writeFile(
      path.join(runDirectory, "01_document.json"),
      JSON.stringify(document),
    ),
    writeFile(
      path.join(runDirectory, "02_lecture_plan.json"),
      JSON.stringify(plan),
    ),
    writeFile(path.join(runDirectory, "00_config.json"), JSON.stringify(config)),
  ]);
  const now = new Date().toISOString();
  const job: JobRecord = {
    id: "outline-job",
    owner_uid: "local-development",
    run_id: "outline-job",
    status: "AWAITING_APPROVAL",
    stage: "AWAITING_APPROVAL",
    progress: 30,
    created_at: now,
    updated_at: now,
    input_file: path.join(directory, "input.pdf"),
    original_filename: "input.pdf",
    input_size_bytes: 100,
    fields: {
      aspect_ratio: "16:9",
      duration_option: "5-8",
      language: "vi",
      voice_id: "vi-VN-Neural2-A",
    },
    attempt: 1,
    run_directory: runDirectory,
    warnings: [],
  };
  await writeFile(
    path.join(backendDirectory, "jobs", `${job.id}.json`),
    JSON.stringify(job),
  );
  const server = await createServer(directory, {
    backendDirectory,
    autoRunJobs: false,
  });
  t.after(() => server.close());

  const preview = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/outline`,
  });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().document.total_pages, 1);
  assert.equal(preview.json().plan.draft.chapters.length, 1);

  const draft = {
    title: "Bài giảng đã duyệt",
    chapters: [
      {
        chapter_id: "chapter-1",
        title: "Chapter đã sửa",
        learning_objectives: ["Hiểu sâu khái niệm"],
        detail_level: "deep",
      },
    ],
  };
  const saved = await server.inject({
    method: "PUT",
    url: `/api/jobs/${job.id}/outline`,
    headers: { "content-type": "application/json" },
    payload: draft,
  });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().plan.draft.title, "Bài giảng đã duyệt");

  const approved = await server.inject({
    method: "POST",
    url: `/api/jobs/${job.id}/approve`,
    headers: { "content-type": "application/json" },
    payload: draft,
  });
  assert.equal(approved.statusCode, 202);
  assert.equal(approved.json().status, "QUEUED");
  assert.equal(approved.json().stage, "QUEUED_AFTER_APPROVAL");
  const approvedPlan = JSON.parse(
    await readFile(path.join(runDirectory, "02_lecture_plan.json"), "utf8"),
  );
  assert.equal(approvedPlan.title, "Bài giảng đã duyệt");
  assert.equal(approvedPlan.chapters[0].title, "Chapter đã sửa");
  assert.ok(approvedPlan.chapters[0].duration_seconds > 48);
  await access(path.join(runDirectory, "02_lecture_plan.original.json"));
});

test("returns chapter timestamps, coverage and protected source pages for a completed job", async (t) => {
  const directory = await temporaryDirectory(t);
  const backendDirectory = path.join(directory, "backend");
  const runDirectory = path.join(directory, "runs", "result-job");
  const pagesDirectory = path.join(runDirectory, "assets", "pages");
  await mkdir(path.join(backendDirectory, "jobs"), { recursive: true });
  await mkdir(pagesDirectory, { recursive: true });
  const pageImagePath = path.join(pagesDirectory, "page-001.png");
  const thumbnailPath = path.join(pagesDirectory, "page-001-thumb.png");
  await writeFile(pageImagePath, Buffer.from("page image"));
  await writeFile(thumbnailPath, Buffer.from("thumbnail"));

  const document = {
    schema_version: "1.0",
    title: "Tài liệu kết quả",
    source_file: "input.pdf",
    source_sha256: "a".repeat(64),
    source_size_bytes: 100,
    language: "vi",
    total_pages: 1,
    sources: [
      {
        source_id: "src-1",
        page: 1,
        element_type: "TEXT",
        excerpt: "Bằng chứng từ trang một",
        confidence: 0.98,
      },
    ],
    pages: [
      {
        page: 1,
        summary: "Tóm tắt trang một",
        concepts: ["Khái niệm"],
        source_ids: ["src-1"],
        warnings: [],
        assets: {
          page_image_path: pageImagePath,
          thumbnail_path: thumbnailPath,
          width: 100,
          height: 100,
          thumbnail_width: 50,
          thumbnail_height: 50,
        },
      },
    ],
    sections: [],
    warnings: [],
  };
  const plan = {
    schema_version: "1.0",
    title: "Bài giảng kết quả",
    coverage_mode: "FULL",
    audience: "beginner",
    language: "vi",
    estimated_duration_seconds: 12,
    learning_objectives: ["Hiểu khái niệm"],
    chapters: [
      {
        chapter_id: "chapter-1",
        title: "Chapter một",
        learning_objectives: ["Hiểu khái niệm"],
        duration_seconds: 12,
        source_ids: ["src-1"],
        page_numbers: [1],
        items: [
          {
            item_id: "item-1",
            title: "Khái niệm",
            treatment: "EXPLAIN",
            reason: "Nội dung chính",
            source_ids: ["src-1"],
            page_numbers: [1],
            estimated_narration_words: 20,
            duration_seconds: 12,
          },
        ],
      },
    ],
    coverage: {
      total_pages: 1,
      total_sources: 1,
      accounted_pages: [1],
      accounted_source_ids: ["src-1"],
      covered_pages: [1],
      reference_pages: [],
      unreadable_pages: [],
      duplicate_pages: [],
      coverage_rate: 1,
    },
    warnings: [],
  };
  const manifest = {
    schema_version: "1.0",
    video_path: "runs/result-job/lecture.mp4",
    video_sha256: "b".repeat(64),
    file_size_bytes: 1000,
    video_codec: "h264",
    audio_codec: "aac",
    width: 1920,
    height: 1080,
    fps: 30,
    total_scenes: 1,
    subtitle_path: "runs/result-job/lecture.srt",
    subtitle_sha256: "c".repeat(64),
    duration_seconds: 12,
    chapter_timestamps: [
      { chapter_id: "chapter-1", start_seconds: 0 },
    ],
    coverage_report_path: "runs/result-job/coverage-report.json",
    coverage_report_sha256: "d".repeat(64),
    warnings: [],
  };
  await Promise.all([
    writeFile(
      path.join(runDirectory, "01_document.json"),
      JSON.stringify(document),
    ),
    writeFile(
      path.join(runDirectory, "02_lecture_plan.json"),
      JSON.stringify(plan),
    ),
    writeFile(
      path.join(runDirectory, "06_video_manifest.json"),
      JSON.stringify(manifest),
    ),
  ]);
  const now = new Date().toISOString();
  const job: JobRecord = {
    id: "result-job",
    owner_uid: "alice",
    run_id: "result-job",
    status: "COMPLETED",
    stage: "COMPLETED",
    progress: 100,
    created_at: now,
    updated_at: now,
    input_file: path.join(directory, "input.pdf"),
    original_filename: "input.pdf",
    input_size_bytes: 100,
    fields: {
      aspect_ratio: "16:9",
      duration_option: "0-1",
      language: "vi",
      voice_id: "vi-VN-Neural2-A",
    },
    attempt: 1,
    run_directory: runDirectory,
    warnings: [],
  };
  await writeFile(
    path.join(backendDirectory, "jobs", `${job.id}.json`),
    JSON.stringify(job),
  );
  const firebase: FirebaseServices = {
    async verifyIdToken(token) {
      if (token === "alice-token") return { uid: "alice" };
      if (token === "bob-token") return { uid: "bob" };
      throw new Error("invalid token");
    },
    async persistJob() {},
    async uploadInput() {
      return "gs://test/input.pdf";
    },
    async uploadArtifacts() {
      return {};
    },
  };
  const server = await createServer(directory, {
    backendDirectory,
    autoRunJobs: false,
    authRequired: true,
    firebaseServices: firebase,
  });
  t.after(() => server.close());

  const result = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/result`,
    headers: { authorization: "Bearer alice-token" },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().coverage.rate, 1);
  assert.equal(result.json().chapters[0].start_seconds, 0);
  assert.equal(result.json().chapters[0].end_seconds, 12);
  assert.equal(result.json().chapters[0].sources[0].page, 1);
  assert.equal(
    result.json().pages[0].image_url,
    `/api/jobs/${job.id}/result/pages/1`,
  );

  const page = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/result/pages/1`,
    headers: { authorization: "Bearer alice-token" },
  });
  assert.equal(page.statusCode, 200);
  assert.equal(page.headers["content-type"], "image/png");
  assert.equal(page.rawPayload.toString(), "page image");

  const otherOwner = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/result`,
    headers: { authorization: "Bearer bob-token" },
  });
  assert.equal(otherOwner.statusCode, 404);

  const invalidFeedback = await server.inject({
    method: "PUT",
    url: `/api/jobs/${job.id}/feedback`,
    headers: {
      authorization: "Bearer alice-token",
      "content-type": "application/json",
    },
    payload: { overall_rating: 8 },
  });
  assert.equal(invalidFeedback.statusCode, 400);

  const feedbackPayload = {
    overall_rating: 4,
    content_accuracy: "MINOR_ISSUE",
    clarity_rating: 5,
    duration_fit: "JUST_RIGHT",
    would_use_again: true,
    issue_details: "Cần giải thích kỹ hơn ở phút 0:05.",
    comment: "Hình ảnh dễ theo dõi.",
  };
  const savedFeedback = await server.inject({
    method: "PUT",
    url: `/api/jobs/${job.id}/feedback`,
    headers: {
      authorization: "Bearer alice-token",
      "content-type": "application/json",
    },
    payload: feedbackPayload,
  });
  assert.equal(savedFeedback.statusCode, 200);
  assert.equal(savedFeedback.json().feedback.overall_rating, 4);
  assert.ok(savedFeedback.json().feedback.created_at);

  const loadedFeedback = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/feedback`,
    headers: { authorization: "Bearer alice-token" },
  });
  assert.equal(loadedFeedback.statusCode, 200);
  assert.equal(
    loadedFeedback.json().feedback.issue_details,
    feedbackPayload.issue_details,
  );

  const otherOwnerFeedback = await server.inject({
    method: "GET",
    url: `/api/jobs/${job.id}/feedback`,
    headers: { authorization: "Bearer bob-token" },
  });
  assert.equal(otherOwnerFeedback.statusCode, 404);
});
