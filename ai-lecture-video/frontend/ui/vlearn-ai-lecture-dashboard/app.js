const body = document.body;
const themeToggle = document.querySelector(".theme-toggle");
const themeLabel = document.querySelector(".theme-label");
const playButtons = document.querySelectorAll(".play-button, .player-play");
const videoStage = document.querySelector(".video-stage");
const videoTag = document.querySelector(".video-tag");
const chapterButtons = document.querySelectorAll(".chapter");
const tabs = document.querySelectorAll(".tab");

const workflowModal = document.querySelector("#workflowModal");
const openLessonWorkflow = document.querySelector("#openLessonWorkflow");
const closeWorkflow = document.querySelector("#closeWorkflow");
const workflowScreens = document.querySelectorAll("[data-workflow-screen]");
const workflowPathSteps = document.querySelectorAll("[data-path-step]");
const lessonChoices = document.querySelectorAll(".lesson-choice");
const startSummary = document.querySelector("#startSummary");
const goToRender = document.querySelector("#goToRender");
const completeRender = document.querySelector("#completeRender");
const openReadyVideo = document.querySelector("#openReadyVideo");
const returnToSelectorButtons = document.querySelectorAll(".close-from-status");
const selectedLessonText = document.querySelector("#selectedLessonText strong");
const summaryLessonName = document.querySelector("#summaryLessonName");
const renderLessonName = document.querySelector("#renderLessonName");
const readyLessonName = document.querySelector("#readyLessonName");
const readyNotice = document.querySelector("#readyNotice");
const readyNoticeText = document.querySelector("#readyNoticeText");
const summaryTimer = document.querySelector("#summaryTimer");
const renderTimer = document.querySelector("#renderTimer");
const routeLinks = document.querySelectorAll("[data-route-link]");
const routeViews = document.querySelectorAll("[data-route-view]");
const primaryRouteLinks = document.querySelectorAll(".primary-nav [data-route-link]");
const utilityRouteLinks = document.querySelectorAll(".text-action[data-route-link]");

let selectedLesson = "Day05_2 · AI Lecture Video";
let activeTimer = null;
let themeTransitionTimer = null;
const stageOrder = ["select", "summary", "render", "ready"];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function stopTimer() {
  if (activeTimer) {
    window.clearInterval(activeTimer);
    activeTimer = null;
  }
}

function startTimer(target, startAt) {
  stopTimer();
  let seconds = startAt;
  target.textContent = formatTime(seconds);
  activeTimer = window.setInterval(() => {
    seconds += 1;
    target.textContent = formatTime(seconds);
  }, 1000);
}

function updateSelectedLesson() {
  selectedLessonText.textContent = selectedLesson;
  summaryLessonName.textContent = selectedLesson;
  renderLessonName.textContent = selectedLesson;
  readyLessonName.textContent = selectedLesson;
}

function setWorkflowStage(stage) {
  const currentIndex = stageOrder.indexOf(stage);
  workflowScreens.forEach((screen) => {
    const isActive = screen.dataset.workflowScreen === stage;
    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
  });
  workflowPathSteps.forEach((step) => {
    step.classList.toggle("active", stageOrder.indexOf(step.dataset.pathStep) <= currentIndex);
  });
  if (stage === "summary") startTimer(summaryTimer, 24);
  else if (stage === "render") startTimer(renderTimer, 48);
  else stopTimer();
}

function openWorkflow(stage = "select") {
  updateSelectedLesson();
  workflowModal.hidden = false;
  body.classList.add("workflow-open");
  setWorkflowStage(stage);
}

function closeWorkflowModal() {
  stopTimer();
  workflowModal.hidden = true;
  body.classList.remove("workflow-open");
}

const routeTitles = {
  lecture: "AI Lecture Video",
  home: "Tổng quan học tập",
  courses: "Khóa học của tôi",
  notebook: "Sổ tay học tập",
  codelabs: "Codelabs AI",
};

function routeFromHash() {
  const legacyRoutes = { "#top": "lecture", "#route": "courses", "#notes": "notebook" };
  return legacyRoutes[window.location.hash] || window.location.hash.replace("#", "") || "lecture";
}

function setRoute(route, shouldScroll = true) {
  const activeRoute = routeTitles[route] ? route : "lecture";
  routeViews.forEach((view) => {
    view.hidden = view.dataset.routeView !== activeRoute;
  });
  primaryRouteLinks.forEach((link) => {
    const linkRoute = link.dataset.routeLink;
    link.classList.toggle("active", linkRoute === activeRoute || (activeRoute === "lecture" && linkRoute === "home"));
  });
  utilityRouteLinks.forEach((link) => link.classList.toggle("active", link.dataset.routeLink === activeRoute));
  document.title = `VLearn · ${routeTitles[activeRoute]}`;
  if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

routeLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const route = link.dataset.routeLink;
    if (!route) return;
    event.preventDefault();
    if (!workflowModal.hidden) closeWorkflowModal();
    if (window.location.hash !== `#${route}`) window.history.pushState(null, "", `#${route}`);
    setRoute(route);
  });
});

window.addEventListener("popstate", () => setRoute(routeFromHash(), false));
setRoute(routeFromHash(), false);

themeToggle.addEventListener("click", () => {
  body.classList.remove("theme-transitioning");
  void body.offsetWidth;
  body.classList.add("theme-transitioning");
  const isDark = body.classList.toggle("theme-dark");
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.querySelector("span").textContent = isDark ? "☀" : "☾";
  themeLabel.textContent = isDark ? "Giao diện sáng" : "Giao diện tối";
  window.clearTimeout(themeTransitionTimer);
  themeTransitionTimer = window.setTimeout(() => body.classList.remove("theme-transitioning"), 520);
});

playButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isPlaying = videoStage.classList.toggle("is-playing");
    videoTag.textContent = isPlaying ? "Đang phát · 06:32" : "Bài giảng tạm dừng";
    playButtons.forEach((item) => {
      item.textContent = isPlaying ? "Ⅱ" : "▶";
      item.setAttribute("aria-label", isPlaying ? "Dừng video" : "Phát video");
    });
  });
});

chapterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chapterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
  });
});

openLessonWorkflow.addEventListener("click", () => openWorkflow());
closeWorkflow.addEventListener("click", closeWorkflowModal);

lessonChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    lessonChoices.forEach((item) => {
      item.classList.remove("selected");
      item.querySelector("i").textContent = "○";
    });
    choice.classList.add("selected");
    choice.querySelector("i").textContent = "✓";
    selectedLesson = choice.dataset.lesson;
    updateSelectedLesson();
  });
});

startSummary.addEventListener("click", () => setWorkflowStage("summary"));
goToRender.addEventListener("click", () => setWorkflowStage("render"));
completeRender.addEventListener("click", () => setWorkflowStage("ready"));

returnToSelectorButtons.forEach((button) => {
  button.addEventListener("click", () => setWorkflowStage("select"));
});

openReadyVideo.addEventListener("click", () => {
  readyNotice.hidden = false;
  readyNoticeText.textContent = `${selectedLesson} đã được tóm tắt và render video.`;
  videoTag.textContent = "Video tóm tắt sẵn sàng";
  closeWorkflowModal();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

workflowModal.addEventListener("click", (event) => {
  if (event.target === workflowModal) closeWorkflowModal();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !workflowModal.hidden) closeWorkflowModal();
});
