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

const navItems = [
  { label: "Library", href: "/" },
  { label: "Add New", href: "/books/new" },
];
const Navbar = () => {
  const pathName = usePathname();
  const { user } = useUser();

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

        <nav className="fit flex gap-7 items-center">
          {navItems.map(({ label, href }) => {
            const isActive =
              pathName === href || (href !== "/" && pathName.startsWith(href));

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
              <div className="nav-user-link">
                {user?.firstName && (
                  <Link href="/subscriptions" className="nav-user-name">
                    {user.firstName}
                  </Link>
                )}
                <UserButton />
              </div>
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
