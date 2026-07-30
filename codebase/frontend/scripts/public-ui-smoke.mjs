import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const projectDirectory = path.resolve(process.cwd());
const environment = Object.fromEntries(
  (await readFile(path.join(projectDirectory, ".env.production"), "utf8"))
    .split(/\r?\n/u)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const apiKey = environment.VITE_FIREBASE_API_KEY;
const apiBase = environment.VITE_API_BASE_URL;
const hostingUrl = "https://project-5d300c02-d165-4037-b6f.web.app";
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
if (!apiKey || !apiBase) throw new Error("Thiếu production Firebase/API config.");

const suffix = crypto.randomUUID().replaceAll("-", "");
const email = `ui-smoke-${suffix}@example.com`;
const password = `Sm0ke!${suffix}`;
let idToken;
let jobId;
let browser;
let accountCreated = false;

async function fetchWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

async function api(pathname, options = {}) {
  return fetchWithRetry(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });
}

try {
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      runtimeErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto(`${hostingUrl}/register`, { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="name"]').fill("UI Smoke Test");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^Tạo tài khoản$/iu }).click();
  await page.waitForURL("**/app/create", { timeout: 30_000 });
  accountCreated = true;
  await page.locator(".profile-button").click();
  await page.getByRole("button", { name: /Đăng xuất/iu }).click();
  await page.waitForURL("**/login", { timeout: 30_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^Đăng nhập$/iu }).click();
  await page.waitForURL("**/app/create", { timeout: 30_000 });

  const signin = await fetchWithRetry(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signinBody = await signin.json();
  if (!signin.ok) throw new Error(JSON.stringify(signinBody));
  idToken = signinBody.idToken;

  const pdf = await readFile(
    path.resolve(projectDirectory, "../backend/inputs/example.pdf"),
  );
  const form = new FormData();
  form.append("file", new Blob([pdf], { type: "application/pdf" }), "example.pdf");
  const upload = await api("/documents", { method: "POST", body: form });
  const uploaded = await upload.json();
  if (!upload.ok) throw new Error(JSON.stringify(uploaded));
  jobId = uploaded.id;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const statusResponse = await api(`/jobs/${jobId}`);
    const status = await statusResponse.json();
    if (status.status === "COMPLETED") break;
    if (["FAILED", "CANCELLED"].includes(status.status)) {
      throw new Error(`Document pipeline ${status.status}: ${status.error ?? ""}`);
    }
    if (attempt === 59) throw new Error("Document pipeline timeout.");
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  await page.goto(`${hostingUrl}/app/documents`, { waitUntil: "networkidle" });
  await page.getByText("example.pdf", { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Tóm Tắt/iu }).click();
  await page.locator(".summary-content").waitFor({ timeout: 180_000 });
  const errorText = await page.locator(".summary-error").allTextContents();
  if (errorText.length) throw new Error(errorText.join("; "));
  if (!(await page.locator(".pdf-reading-pane iframe").count())) {
    throw new Error("PDF iframe không xuất hiện trong trang tóm tắt.");
  }
  await mkdir(
    path.resolve(projectDirectory, "../backend/backend-data/docker-smoke"),
    { recursive: true },
  );
  await page.screenshot({
    path: path.resolve(
      projectDirectory,
      "../backend/backend-data/docker-smoke/public-summary-ui.png",
    ),
    fullPage: true,
  });
  if (runtimeErrors.length) {
    throw new Error(`Browser errors: ${runtimeErrors.join(" | ")}`);
  }
  process.stdout.write("PUBLIC_UI_SUMMARY=OK\n");
} finally {
  await browser?.close();
  if (accountCreated && !idToken) {
    const signin = await fetchWithRetry(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    if (signin.ok) idToken = (await signin.json()).idToken;
  }
  if (jobId && idToken) {
    const current = await api(`/jobs/${jobId}`).then((response) => response.json()).catch(() => null);
    if (current && ["QUEUED", "RUNNING", "AWAITING_APPROVAL"].includes(current.status)) {
      await api(`/jobs/${jobId}/cancel`, { method: "POST" }).catch(() => undefined);
    }
    const deleted = await api(`/jobs/${jobId}`, { method: "DELETE" });
    if (!deleted.ok && deleted.status !== 404) {
      throw new Error(`Không thể cleanup smoke job: HTTP ${deleted.status}.`);
    }
  }
  if (idToken) {
    const deletedUser = await fetchWithRetry(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!deletedUser.ok) {
      throw new Error(`Không thể cleanup smoke user: HTTP ${deletedUser.status}.`);
    }
  }
}
