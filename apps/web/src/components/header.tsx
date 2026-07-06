import { Link } from "@tanstack/react-router";
import { BikeIcon } from "lucide-react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const links = [{ to: "/", label: "Dashboard" }] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-3 py-2">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <BikeIcon className="size-4 text-emerald-500" />
            <span>Ride Lens</span>
          </Link>
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to} className="text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
