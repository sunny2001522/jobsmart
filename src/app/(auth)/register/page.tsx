"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedToast as toast } from "@/lib/i18n/toast";
import { useI18n } from "@/contexts/i18n-context";
import { BrandLogo } from "@/components/brand-logo";

export default function RegisterPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [returnTo, setReturnTo] = useState("/applications");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("redirectTo") || "/applications";
    setReturnTo(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/applications");
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/local/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, locale }) });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || t("auth.registerFailed")); return; }
      toast.success(t("auth.registerSuccess"));
      const requestedRedirect = new URLSearchParams(window.location.search).get("redirectTo") || "/applications";
      const redirectTo = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : "/applications";
      router.push(redirectTo);
    } catch {
      toast.error(t("auth.registerError"));
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <Link href="/" aria-label="WiSEjOB" className="mb-4 flex items-center justify-center">
          <BrandLogo />
        </Link>
        <CardTitle>{t("auth.createAccount")}</CardTitle>
        <CardDescription>
          {t("auth.registerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.name")}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t("auth.yourName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t("auth.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.registering") : t("auth.register")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
      <Link href={`/login?redirectTo=${encodeURIComponent(returnTo)}`} className="text-primary hover:underline">
            {t("auth.signInLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
