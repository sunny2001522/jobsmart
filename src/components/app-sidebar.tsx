"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Kanban,
  FileText,
  Mic,
  Heart,
  Settings,
  LogOut,
  Orbit,
} from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNavItems = [
  {
    labelKey: "nav.applications",
    href: "/applications",
    icon: Kanban,
  },
  {
    labelKey: "nav.resume",
    href: "/resume",
    icon: FileText,
  },
] as const;

const toolNavItems = [
  {
    labelKey: "nav.interview",
    href: "/interview",
    icon: Mic,
  },
  {
    labelKey: "nav.values",
    href: "/values",
    icon: Heart,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const handleSignOut = async () => {
    await fetch("/api/auth/local/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/applications" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            J
          </div>
          <span className="font-semibold text-lg">JobSmart</span>
        </Link>
      </SidebarHeader>

      <SidebarContent data-tour="nav">
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.mainGroup")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.toolsGroup")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="mb-3 px-2">
          <LanguageSwitcher className="h-9 w-full" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{t("nav.user")}</p>
                <p className="text-xs text-muted-foreground">{t("nav.freePlan")}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/linkedin" className="flex items-center gap-2">
                <Orbit className="h-4 w-4" />
                {t("nav.linkedinSync")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
