"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import "./TopNav.css";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Handle keyboard shortcut "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only focus if not already typing in an input
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const searchInput = document.querySelector(".topNavSearchInput") as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="topNav">
      <div className="topNavContainer">
        <Link href="/feed" className="topNavTitle">
          <Logo />
        </Link>
        <div className="topNavRight">
          <div className="topNavSearchContainer">
            <form onSubmit={handleSearch} className="topNavSearch">
              <svg
                className="topNavSearchIcon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.4351 10.0629H10.7124L10.4563 9.81589C11.3528 8.77301 11.8925 7.4191 11.8925 5.94625C11.8925 2.66209 9.23042 0 5.94625 0C2.66209 0 0 2.66209 0 5.94625C0 9.23042 2.66209 11.8925 5.94625 11.8925C7.4191 11.8925 8.77301 11.3528 9.81589 10.4563L10.0629 10.7124V11.4351L14.6369 16L16 14.6369L11.4351 10.0629ZM5.94625 10.0629C3.66838 10.0629 1.82962 8.22413 1.82962 5.94625C1.82962 3.66838 3.66838 1.82962 5.94625 1.82962C8.22413 1.82962 10.0629 3.66838 10.0629 5.94625C10.0629 8.22413 8.22413 10.0629 5.94625 10.0629Z"
                  fill="currentColor"
                />
              </svg>
              <input
                type="text"
                className="topNavSearchInput"
                placeholder="Search or jump to..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
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
      </div>
    </nav>
  );
}

