"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Kanban,
  Building2,
  Mic,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { MessageKey } from "@/lib/i18n/messages";

const features = [
  {
    icon: Kanban,
    titleKey: "landing.feature.tracking",
    descriptionKey: "landing.feature.trackingDescription",
  },
  {
    icon: FileText,
    titleKey: "landing.feature.resume",
    descriptionKey: "landing.feature.resumeDescription",
  },
  {
    icon: Building2,
    titleKey: "landing.feature.reviews",
    descriptionKey: "landing.feature.reviewsDescription",
  },
  {
    icon: Mic,
    titleKey: "landing.feature.interview",
    descriptionKey: "landing.feature.interviewDescription",
  },
  {
    icon: Heart,
    titleKey: "landing.feature.values",
    descriptionKey: "landing.feature.valuesDescription",
  },
] satisfies { icon: typeof Kanban; titleKey: MessageKey; descriptionKey: MessageKey }[];

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              J
            </div>
            <span className="font-semibold text-lg">JobSmart</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="w-[42px] px-2 sm:w-[118px] sm:px-3" compactOnMobile />
            <Button variant="ghost" asChild>
              <Link href="/login">{t("landing.signIn")}</Link>
            </Button>
            <Button asChild>
              <Link href="/register">{t("landing.signUp")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge className="mb-4" variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          {t("landing.badge")}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t("landing.heroDescription")}
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/applications">
              {t("landing.openApplications")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t("landing.signIn")}</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">{t("landing.featureHeading")}</h2>
          <p className="mt-4 text-muted-foreground">
            {t("landing.featureIntro")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.titleKey}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t(feature.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold">{t("landing.ctaTitle")}</h2>
          <p className="mt-4 text-muted-foreground">
            {t("landing.ctaDescription")}
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/register">
              {t("landing.ctaButton")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 JobSmart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
