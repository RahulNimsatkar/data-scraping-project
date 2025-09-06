import { cn } from "@/lib/utils";
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
  User
} from "lucide-react";

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "/", active: true },
  { icon: Search, label: "AI Analysis", href: "/analysis" },
  { icon: ListTodo, label: "Scraping Tasks", href: "/tasks" },
  { icon: Database, label: "Data Management", href: "/data" },
  { icon: Code, label: "Generated Code", href: "/code" },
  { icon: Key, label: "API Keys", href: "/api-keys" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">ScraperAI</span>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all",
                item.active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-4 h-4" />
              <span className={item.active ? "font-medium" : ""}>{item.label}</span>
            </a>
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
