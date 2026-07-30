import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

interface RouterValue {
  pathname: string;
  state: unknown;
  navigate: (
    to: string,
    options?: { replace?: boolean; state?: unknown },
  ) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    state: window.history.state as unknown,
  }));

  useEffect(() => {
    const update = () =>
      setLocation({
        pathname: window.location.pathname,
        state: window.history.state as unknown,
      });
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  function navigate(
    to: string,
    options: { replace?: boolean; state?: unknown } = {},
  ) {
    if (options.replace) {
      window.history.replaceState(options.state ?? null, "", to);
    } else {
      window.history.pushState(options.state ?? null, "", to);
    }
    setLocation({ pathname: to, state: options.state ?? null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <RouterContext.Provider value={{ ...location, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRouter must be used inside RouterProvider");
  return value;
}

export function useNavigate() {
  return useRouter().navigate;
}

export function Link({
  to,
  onClick,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string }) {
  const navigate = useNavigate();
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handleClick} {...props} />;
}

export function NavLink({
  to,
  className,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & {
  to: string;
  className?: string | ((value: { isActive: boolean }) => string);
}) {
  const { pathname } = useRouter();
  const resolvedClassName =
    typeof className === "function"
      ? className({ isActive: pathname === to })
      : className;
  return (
    <Link to={to} className={resolvedClassName} {...props}>
      {children}
    </Link>
  );
}
