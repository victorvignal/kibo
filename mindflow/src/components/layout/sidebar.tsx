"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  LogOut,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/risk", label: "Análise de Risco", icon: ShieldAlert },
  { href: "/assistant", label: "Assistente Kibo", icon: MessageSquare },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="flex flex-col w-64 border-r bg-card">
      <div className="flex items-center gap-2 p-4 border-b">
        <img src="/kibo-logo.png" alt="Kibo" className="w-10 h-10" />
        <div>
          <h1 className="font-bold text-lg">MindFlow</h1>
          <p className="text-xs text-muted-foreground">Digital Phenotyping</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-secondary font-medium"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
