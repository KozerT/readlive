"use client";
import { cn } from "@/lib/utils";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useRef, useState } from "react";

const navItems = [
  { label: "Library", href: "/" },
  { label: "Add New", href: "/books/new" },
  { label: "Subscriptions", href: "/subscriptions" },
];
const Navbar = () => {
  const pathName = usePathname();
  const { user } = useUser();
  const userMenuRef = useRef<HTMLDivElement>(null);
  // Remember the page the menu was opened on, so navigating closes it
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const isMenuOpen = menuOpenedAt === pathName;

  const isActiveLink = (href: string) =>
    pathName === href || (href !== "/" && pathName.startsWith(href));

  return (
    <header className="w-full fixed z-50 bg-primary">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className=" flex items-center gap-0.5">
          <Image
            src="/logo.svg"
            alt="ReadLive"
            className="h-4 w-auto"
            width={70}
            height={20}
            priority
          />
        </Link>

        <nav className="fit hidden lg:flex gap-7 items-center">
          {navItems.map(({ label, href }) => {
            const isActive = isActiveLink(href);

            return (
              <Link
                href={href}
                key={label}
                className={cn(
                  "nav-link-small",
                  isActive
                    ? "nav-link-active"
                    : "text-amber-50 hover:opacity-70"
                )}
              >
                {label}
              </Link>
            );
          })}
          <div className="flex items-center gap-7">
            <Show when="signed-out">
              <SignInButton>
                <button
                  type="button"
                  className="text-sm text-amber-50 hover:opacity-70"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button type="button" className="btn-tertiary">
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <div className="nav-user-link" ref={userMenuRef}>
                {user?.firstName && (
                  // Clicking the name opens the same menu as the avatar
                  <button
                    type="button"
                    className="nav-user-name"
                    onClick={() =>
                      userMenuRef.current
                        ?.querySelector<HTMLButtonElement>("button.cl-userButtonTrigger")
                        ?.click()
                    }
                  >
                    {user.firstName}
                  </button>
                )}
                <UserButton />
              </div>
            </Show>
          </div>
        </nav>

        {/* Tablet & mobile: avatar + hamburger */}
        <div className="flex items-center gap-4 lg:hidden">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <button
            type="button"
            className="text-amber-50 hover:opacity-70"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpenedAt(isMenuOpen ? null : pathName)}
          >
            {isMenuOpen ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-menu"
          className="wrapper flex flex-col gap-1 border-t border-white/10 pb-4 pt-2 lg:hidden"
        >
          {navItems.map(({ label, href }) => (
            <Link
              href={href}
              key={label}
              className={cn(
                "nav-link-small w-fit py-3",
                isActiveLink(href)
                  ? "nav-link-active"
                  : "text-amber-50 hover:opacity-70"
              )}
            >
              {label}
            </Link>
          ))}
          <Show when="signed-out">
            <div className="flex items-center gap-5 py-3">
              <SignInButton>
                <button
                  type="button"
                  className="text-sm text-amber-50 hover:opacity-70"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button type="button" className="btn-tertiary">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </Show>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
