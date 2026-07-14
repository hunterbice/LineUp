import { Link } from "@tanstack/react-router";

import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-3">
          <Logo size={20} />
          <p className="text-sm text-faint">
            © {new Date().getFullYear()} LineUp. Know before you go.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link to="/login" className="font-semibold text-primary transition-colors hover:text-foreground">
            Bar login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
