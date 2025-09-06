import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Settings, CheckCircle, Zap, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalScraped: number;
    activeTasks: number;
    successRate: number;
    apiCalls: number;
  };
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Scraped",
      value: stats?.totalScraped?.toLocaleString() || "0",
      icon: Download,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: "+12.5%",
      changeText: "from last month",
      positive: true
    },
    {
      title: "Active Tasks",
      value: stats?.activeTasks?.toString() || "0",
      icon: Settings,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      changeText: "Running jobs",
      showPulse: true
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      change: "+2.1%",
      changeText: "from last week",
      positive: true
    },
    {
      title: "API Calls",
      value: stats?.apiCalls?.toLocaleString() || "0",
      icon: Zap,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      changeText: "This month"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{card.title}</p>
                  <p 
                    className="text-2xl font-bold text-foreground" 
                    data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm">
                {card.change && (
                  <>
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">{card.change}</span>
                  </>
                )}
                {card.showPulse && (
                  <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse"></div>
                )}
                <span className="text-muted-foreground">{card.changeText}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
