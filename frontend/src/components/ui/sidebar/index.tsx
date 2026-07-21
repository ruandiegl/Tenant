import "./styles.css";
import {
  createContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState
} from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "../../../lib/utils";

type SidebarContextValue = {
  open: boolean;
  mobileOpen: boolean;
  state: "expanded" | "collapsed";
  setOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);
const MOBILE_SIDEBAR_QUERY = "(max-width: 760px)";

type SidebarProviderProps = PropsWithChildren<{
  className?: string;
  defaultOpen?: boolean;
  storageKey?: string;
}>;

export function SidebarProvider({ children, className, defaultOpen = true, storageKey }: SidebarProviderProps) {
  const [open, setOpenState] = useState(() => {
    if (!storageKey) return defaultOpen;
    return window.localStorage.getItem(storageKey) !== "collapsed";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const setOpen = (nextOpen: boolean) => {
    setOpenState(nextOpen);
    if (storageKey) window.localStorage.setItem(storageKey, nextOpen ? "expanded" : "collapsed");
  };

  const toggleSidebar = () => setOpen(!open);
  const toggleMobileSidebar = () => setMobileOpen((current) => !current);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) return;
        event.preventDefault();
        setOpen(!open);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileOpen(false);
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        open,
        setMobileOpen,
        setOpen,
        state: open ? "expanded" : "collapsed",
        toggleMobileSidebar,
        toggleSidebar
      }}
    >
      <div className={cn("ui-sidebar-layout", className)} data-state={open ? "expanded" : "collapsed"}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside SidebarProvider");
  return context;
}

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const { state } = useSidebar();
  return <aside className={cn("ui-sidebar", className)} data-state={state} {...props} />;
}

export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-header", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-content", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-footer", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-group", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-group-label", className)} {...props} />;
}

export function SidebarGroupContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sidebar-group-content", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("ui-sidebar-menu", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("ui-sidebar-menu-item", className)} {...props} />;
}

type SidebarMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  isActive?: boolean;
};

export function SidebarMenuButton({ asChild, className, isActive, type = "button", ...props }: SidebarMenuButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={cn("ui-sidebar-menu-button", className)}
      data-active={isActive ? "true" : "false"}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

export function SidebarMenuSub({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("ui-sidebar-menu-sub", className)} {...props} />;
}

export function SidebarInset({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("ui-sidebar-inset", className)} {...props} />;
}

export function SidebarTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { state, toggleSidebar } = useSidebar();
  const Icon = state === "expanded" ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      aria-label={state === "expanded" ? "Recolher menu lateral" : "Expandir menu lateral"}
      className={cn("ui-sidebar-trigger", className)}
      onClick={toggleSidebar}
      type="button"
      {...props}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
