import {
  Kanban,
  FileText,
  Mic,
  Heart,
  type LucideIcon,
} from "lucide-react";

export interface NavigationPage {
  path: string;
  labelKey: "nav.dashboard" | "nav.applications" | "nav.resume" | "nav.interview" | "nav.values";
  mobileLabelKey: "nav.dashboard" | "nav.mobileApplications" | "nav.mobileResume" | "nav.mobileInterview" | "nav.mobileValues";
  icon: LucideIcon;
}

export const NAVIGATION_PAGES: NavigationPage[] = [
  { path: "/applications", labelKey: "nav.applications", mobileLabelKey: "nav.mobileApplications", icon: Kanban },
  { path: "/resume", labelKey: "nav.resume", mobileLabelKey: "nav.mobileResume", icon: FileText },
  { path: "/interview", labelKey: "nav.interview", mobileLabelKey: "nav.mobileInterview", icon: Mic },
  { path: "/values", labelKey: "nav.values", mobileLabelKey: "nav.mobileValues", icon: Heart },
];

export type NavigationPath = (typeof NAVIGATION_PAGES)[number]["path"];
