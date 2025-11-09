"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

export default function ConditionalTopNav() {
  const pathname = usePathname();
  const isLoginPage = pathname?.includes("/login") || pathname?.includes("/create-account");
  const isLandingPage = pathname === "/";

  if (isLoginPage || isLandingPage) {
    return null;
  }

  return <TopNav />;
}

