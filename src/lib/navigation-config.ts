import {
  LayoutDashboard,
  Kanban,
  FileText,
  Mic,
  Linkedin,
  Heart,
  type LucideIcon,
} from "lucide-react";

export interface NavigationPage {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAVIGATION_PAGES: NavigationPage[] = [
  { path: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { path: "/applications", label: "追蹤", icon: Kanban },
  { path: "/resume", label: "履歷", icon: FileText },
  { path: "/interview", label: "面試", icon: Mic },
  { path: "/linkedin", label: "LinkedIn", icon: Linkedin },
  { path: "/values", label: "價值觀", icon: Heart },
];

export type NavigationPath = (typeof NAVIGATION_PAGES)[number]["path"];
