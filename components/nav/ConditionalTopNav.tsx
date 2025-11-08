"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

export default function ConditionalTopNav() {
  const pathname = usePathname();
  const isLoginPage = pathname?.includes("/login") || pathname?.includes("/create-account");

  if (isLoginPage) {
    return null;
  }

  return <TopNav />;
}

