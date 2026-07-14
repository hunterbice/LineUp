import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV_LINKS = [
  { label: "Features", href: "#how-it-works" },
  { label: "Cities", href: "#coverage" },
  { label: "For Bar Owners", href: "#for-owners" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="LineUp home">
          <Logo size={22} />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <span className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden="true" />

          <Link
            to="/login"
            className="rounded-md px-3 py-2 text-sm font-semibold text-primary transition-colors hover:text-foreground"
          >
            Bar login <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
