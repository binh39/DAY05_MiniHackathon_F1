import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "../contexts";
import { NavLink, useNavigate, useRouter } from "../router";
import { ThemeToggle } from "../theme";
import { Logo } from "./Logo";

const navigation = [
  { to: "/app/create", label: "Tạo bài giảng" },
  { to: "/app/documents", label: "Tài liệu" },
  { to: "/app/videos", label: "Video của tôi" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useRouter();
  const summaryOpen =
    pathname.startsWith("/app/documents/") &&
    pathname.endsWith("/summary");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  async function signOut() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Logo />
          <nav className="header-nav" aria-label="Điều hướng AI Lecture">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `header-nav-item ${isActive ? "active" : ""}`}
              >
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <a
              className="codelabs-link"
              href="https://codelabs.vlearn.dev"
              target="_blank"
              rel="noreferrer"
            >
              Codelabs
            </a>
            <ThemeToggle compact />
            <button className="icon-button notification-button" aria-label="Thông báo">
              <Bell size={19} />
              <span />
            </button>
            <div className="profile-wrap">
              <button
                className="profile-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{user?.name.charAt(0) ?? "M"}</span>
                <span className="profile-copy" aria-hidden="true">
                  <strong>{user?.name ?? "Minh Anh"}</strong>
                  <small>{user?.email ?? "VLearn learner"}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <button>
                    <Settings size={16} /> Cài đặt tài khoản
                  </button>
                  <button onClick={() => void signOut()}>
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="mobile-navigation" aria-label="Điều hướng di động">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <div className="app-main">
        <main className={`page-content ${summaryOpen ? "summary-open" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
