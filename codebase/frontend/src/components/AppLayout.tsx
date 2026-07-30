import {
  Bell,
  ChevronDown,
  CircleHelp,
  FileText,
  Library,
  LogOut,
  Menu,
  Plus,
  Settings,
  Video,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "../contexts";
import { NavLink, useNavigate, useRouter } from "../router";
import { Logo } from "./Logo";

const navigation = [
  { to: "/app/create", label: "Tạo video mới", icon: Plus, primary: true },
  { to: "/app/documents", label: "Tài liệu của tôi", icon: FileText },
  { to: "/app/videos", label: "Video của tôi", icon: Video },
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
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <Logo />
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navigation.map(({ to, label, icon: Icon, primary }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-item ${primary ? "nav-primary" : ""} ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="nav-divider" />
          <button className="nav-item ghost-nav">
            <Library size={20} />
            <span>Mẫu video</span>
            <span className="soon-pill">Sắp có</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item ghost-nav">
            <CircleHelp size={20} />
            <span>Trợ giúp</span>
          </button>
          <button className="nav-item ghost-nav">
            <Settings size={20} />
            <span>Cài đặt</span>
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={22} />
          </button>
          <div className="topbar-spacer" />
          <button className="icon-button notification-button" aria-label="Thông báo">
            <Bell size={20} />
            <span />
          </button>
          <div className="profile-wrap">
            <button
              className="profile-button"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span className="avatar">{user?.name.charAt(0) ?? "M"}</span>
              <span className="profile-copy">
                <strong>{user?.name ?? "Minh Anh"}</strong>
                <small>Gói Starter</small>
              </span>
              <ChevronDown size={17} />
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <button>
                  <Settings size={17} /> Cài đặt tài khoản
                </button>
                <button onClick={() => void signOut()}>
                  <LogOut size={17} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>
        <main className={`page-content ${summaryOpen ? "summary-open" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
