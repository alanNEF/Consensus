"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import "./TopNav.css";

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="topNav">
      <div className="topNavContainer">
        <Link href="/feed" className="topNavTitle">
          <Logo />
        </Link>
        <div className="topNavLinks">
          <Link
            href="/feed"
            className={`topNavLink ${pathname === "/feed" ? "active" : ""}`}
          >
            Feed
          </Link>
          <Link
            href="/your-bills"
            className={`topNavLink ${pathname === "/your-bills" ? "active" : ""}`}
          >
            Your Bills
          </Link>
          <Link
            href="/account"
            className={`topNavLink ${pathname === "/account" ? "active" : ""}`}
          >
            Profile
          </Link>
          <Link
            href="/login"
            className={`topNavLink ${pathname === "/login" ? "active" : ""}`}
          >
            Logout
          </Link>
        </div>
      </div>
    </nav>
  );
}

