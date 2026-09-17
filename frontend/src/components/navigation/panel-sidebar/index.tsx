import "./styles.css";
import { useEffect } from "react";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { BrandLogo } from "../../brand-logo";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger
} from "../../ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from "../../ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";

export type PanelSidebarItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type PanelSidebarGroup = {
  label: string;
  items: PanelSidebarItem[];
  icon?: LucideIcon;
};

type PanelSidebarProps = {
  ariaLabel: string;
  brandTitle: string;
  brandSubtitle: string;
  groups?: PanelSidebarGroup[];
  primaryLabel?: string;
  primaryItems?: PanelSidebarItem[];
  secondaryLabel?: string;
  secondaryItems?: PanelSidebarItem[];
  userName: string;
  userEmail: string;
  contextIcon: LucideIcon;
  contextLabel: string;
  onLogout: () => void;
};

type PanelSidebarNavigationProps = Omit<PanelSidebarProps, "ariaLabel"> & {
  mobile?: boolean;
};

function isRouteActive(pathname: string, item: Pick<PanelSidebarItem, "to" | "end">) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function SidebarLink({ item, mobile = false }: { item: PanelSidebarItem; mobile?: boolean }) {
  const { setMobileOpen, state } = useSidebar();
  const location = useLocation();
  const active = isRouteActive(location.pathname, item);
  const link = (
    <SidebarMenuButton asChild isActive={active}>
      <NavLink end={item.end} onClick={mobile ? () => setMobileOpen(false) : undefined} to={item.to}>
        <span className="panel-sidebar-link-icon">
          <item.icon aria-hidden="true" />
        </span>
        <span>{item.label}</span>
      </NavLink>
    </SidebarMenuButton>
  );

  if (mobile || state === "expanded") return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent>{item.label}</TooltipContent>
    </Tooltip>
  );
}

function PanelSidebarNavigation({
  brandTitle,
  brandSubtitle,
  primaryLabel = "Principal",
  primaryItems,
  groups,
  secondaryLabel = "Sistema",
  secondaryItems,
  userName,
  userEmail,
  contextIcon: ContextIcon,
  contextLabel,
  mobile = false,
  onLogout
}: PanelSidebarNavigationProps) {
  const { setMobileOpen, state } = useSidebar();
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AD";

  const handleLogout = () => {
    if (mobile) setMobileOpen(false);
    onLogout();
  };

  const resolvedGroups: PanelSidebarGroup[] =
    groups && groups.length > 0
      ? groups
      : [
          ...(primaryItems && primaryItems.length > 0
            ? [{ label: primaryLabel, items: primaryItems }]
            : []),
          ...(secondaryItems && secondaryItems.length > 0
            ? [{ label: secondaryLabel, items: secondaryItems }]
            : [])
        ];

  return (
    <>
      <SidebarHeader className="panel-sidebar-header">
        <BrandLogo compact />
        <div className="panel-sidebar-brand-copy">
          <strong>{brandTitle}</strong>
          <span>{brandSubtitle}</span>
        </div>
        {mobile ? (
          <SheetClose asChild>
            <button aria-label="Fechar menu de navegacao" className="panel-sidebar-mobile-close" type="button">
              <X aria-hidden="true" />
            </button>
          </SheetClose>
        ) : (
          <SidebarTrigger />
        )}
      </SidebarHeader>

      <SidebarContent>
        {resolvedGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarLink item={item} mobile={mobile} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="panel-sidebar-account" data-collapsed={!mobile && state === "collapsed"}>
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="panel-sidebar-account-copy">
            <strong>{userName}</strong>
            <span>{userEmail}</span>
          </div>
          <button aria-label="Sair da conta" className="panel-sidebar-logout" onClick={handleLogout} type="button">
            <LogOut aria-hidden="true" />
          </button>
        </div>
        <div className="panel-sidebar-context">
          <ContextIcon aria-hidden="true" />
          <span>{contextLabel}</span>
        </div>
      </SidebarFooter>
    </>
  );
}

export function PanelSidebar(props: PanelSidebarProps) {
  const { ariaLabel, brandSubtitle, brandTitle } = props;
  const { mobileOpen, setMobileOpen } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar aria-label={ariaLabel} className="panel-sidebar-desktop">
        <PanelSidebarNavigation {...props} />
      </Sidebar>

      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <div className="panel-sidebar-mobile-bar">
          <div className="panel-sidebar-mobile-brand">
            <BrandLogo compact />
            <div>
              <strong>{brandTitle}</strong>
              <span>{brandSubtitle}</span>
            </div>
          </div>
          <SheetTrigger asChild>
            <button aria-label="Abrir menu de navegacao" className="panel-sidebar-mobile-trigger" type="button">
              <Menu aria-hidden="true" />
            </button>
          </SheetTrigger>
        </div>

        <SheetContent className="panel-sidebar-mobile-sheet" showCloseButton={false} side="left">
          <SheetTitle className="ui-sheet-title-sr-only">{ariaLabel}</SheetTitle>
          <aside aria-label={ariaLabel} className="panel-sidebar-mobile-navigation">
            <PanelSidebarNavigation {...props} mobile />
          </aside>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
