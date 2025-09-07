import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Bot, 
  BarChart3, 
  Search, 
  ListTodo, 
  Database, 
  Code, 
  Key, 
  TrendingUp,
  Settings,
  User,
  Activity,
  Monitor
} from "lucide-react";

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "/" },
  { icon: Search, label: "AI Analysis", href: "/analyze" },
  { icon: ListTodo, label: "All Tasks", href: "/tasks" },
  { icon: Activity, label: "Active Tasks", href: "/tasks/active" },
  { icon: Database, label: "Data Export", href: "/data" },
  { icon: Code, label: "Code Generator", href: "/code" },
  { icon: Key, label: "API Keys", href: "/api-keys" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
  { icon: Monitor, label: "Task Monitor", href: "/analytics/monitor" },
];

export function Sidebar() {
  const [location] = useLocation();
  
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">ScraperAI</span>
          </div>
        </Link>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                <span className={isActive ? "font-medium" : ""}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-foreground" data-testid="text-username">
              John Developer
            </div>
            <div className="text-xs text-muted-foreground truncate" data-testid="text-user-plan">
              Pro Plan
            </div>
          </div>
          <button 
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
