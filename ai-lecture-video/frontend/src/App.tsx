import { useEffect, type ReactNode } from "react";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider, LibraryProvider, useAuth } from "./contexts";
import { CreateVideoPage } from "./pages/CreateVideoPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { OutlineReviewPage } from "./pages/OutlineReviewPage";
import { VideosPage } from "./pages/VideosPage";
import { useRouter } from "./router";

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return null;
}

function RoutedContent() {
  const { pathname } = useRouter();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <span />
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }
  if (pathname === "/login") {
    return user ? <Redirect to="/app/create" /> : <LoginPage />;
  }
  if (pathname === "/register") {
    return user ? <Redirect to="/app/create" /> : <RegisterPage />;
  }
  if (!user) return <Redirect to="/login" />;

  let page: ReactNode;
  if (pathname.startsWith("/app/outline/")) page = <OutlineReviewPage />;
  else if (pathname === "/app/documents") page = <DocumentsPage />;
  else if (pathname === "/app/videos") page = <VideosPage />;
  else page = <CreateVideoPage />;
  return <AppLayout>{page}</AppLayout>;
}

export function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <RoutedContent />
      </LibraryProvider>
    </AuthProvider>
  );
}
