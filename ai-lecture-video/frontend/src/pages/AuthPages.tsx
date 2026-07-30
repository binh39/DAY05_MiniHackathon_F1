import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts";
import { Link, useNavigate } from "../router";

function AuthVisual() {
  return (
    <section className="auth-visual">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-visual-copy">
        <div className="eyebrow light">
          <Sparkles size={16} /> Học nhanh hơn với AI
        </div>
        <h1>Biến tài liệu thành bài giảng cuốn hút.</h1>
        <p>
          Upload PDF, chọn phong cách và nhận video bài giảng hoàn chỉnh chỉ trong
          vài phút.
        </p>
      </div>
      <div className="auth-demo-card">
        <div className="demo-window-bar">
          <span />
          <span />
          <span />
          <small>Đang tạo video của bạn</small>
        </div>
        <div className="demo-preview">
          <div className="demo-slide">
            <small>CHƯƠNG 01</small>
            <strong>Giới thiệu về Tiến trình</strong>
            <span>Khái niệm nền tảng của hệ điều hành</span>
          </div>
          <button aria-label="Phát video">
            <Play size={22} fill="currentColor" />
          </button>
        </div>
        <div className="demo-progress">
          <div className="demo-progress-row">
            <span>Phân tích nội dung</span>
            <strong>Hoàn tất</strong>
          </div>
          <div className="demo-track">
            <span />
          </div>
        </div>
      </div>
      <div className="auth-trust">
        <span>
          <Check size={16} /> Bám sát tài liệu gốc
        </span>
        <span>
          <ShieldCheck size={16} /> Dữ liệu được bảo mật
        </span>
      </div>
    </section>
  );
}

function SocialButtons() {
  return (
    <div className="social-buttons">
      <button type="button">
        <span className="google-g">G</span>
        Tiếp tục với Google
      </button>
      <button type="button">
        <span className="microsoft-icon">
          <i />
          <i />
          <i />
          <i />
        </span>
        Microsoft
      </button>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@lecture.ai");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Vui lòng nhập email hợp lệ và mật khẩu từ 6 ký tự.");
      return;
    }
    login(email);
    navigate("/app/create");
  }

  return (
    <div className="auth-page">
      <AuthVisual />
      <main className="auth-form-side">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập để tiếp tục tạo những bài giảng tuyệt vời.</p>
          </div>
          <SocialButtons />
          <div className="or-divider">
            <span>hoặc đăng nhập bằng email</span>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@example.com"
                autoComplete="email"
              />
            </label>
            <label>
              <span className="label-row">
                Mật khẩu
                <button type="button" className="text-button">
                  Quên mật khẩu?
                </button>
              </span>
              <span className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <label className="remember-row">
              <input type="checkbox" defaultChecked />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button auth-submit">
              Đăng nhập <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            Chưa có tài khoản? <Link to="/register">Đăng ký miễn phí</Link>
          </p>
          <p className="auth-terms">
            Bằng việc tiếp tục, bạn đồng ý với <a>Điều khoản sử dụng</a> và{" "}
            <a>Chính sách bảo mật</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || !email.includes("@") || password.length < 8) {
      setError("Nhập họ tên, email hợp lệ và mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    login(email, name.trim());
    navigate("/app/create");
  }

  return (
    <div className="auth-page">
      <AuthVisual />
      <main className="auth-form-side">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-form-wrap register-wrap">
          <div className="auth-heading">
            <h2>Tạo tài khoản miễn phí</h2>
            <p>Bắt đầu với 30 phút video miễn phí mỗi tháng.</p>
          </div>
          <SocialButtons />
          <div className="or-divider">
            <span>hoặc đăng ký bằng email</span>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label>
              Họ và tên
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nguyễn Minh Anh"
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@example.com"
                autoComplete="email"
              />
            </label>
            <label>
              Mật khẩu
              <span className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <div className="password-hints">
              <span className={password.length >= 8 ? "met" : ""}>
                <Check size={14} /> 8 ký tự
              </span>
              <span className={/[A-Za-z]/.test(password) ? "met" : ""}>
                <Check size={14} /> Có chữ cái
              </span>
              <span className={/\d/.test(password) ? "met" : ""}>
                <Check size={14} /> Có chữ số
              </span>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button auth-submit">
              Tạo tài khoản <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
          <div className="register-benefit">
            <FileText size={18} />
            Không cần thẻ tín dụng · Hủy bất cứ lúc nào
          </div>
        </div>
      </main>
    </div>
  );
}
