import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, RefreshCw, Edit, Trash2, ExternalLink, ChevronLeft, ChevronRight, Database, FileJson, Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScrapedDataItem {
  id: string;
  taskId: string;
  data: Record<string, any>;
  url: string;
  scrapedAt: string;
}

export function DataTable() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<'json' | 'table'>('json');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get recent scraped data from the most recent completed task
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Find the most recently completed task with scraped data
  const recentTask = (tasks as any[])?.find(task => 
    task.status === 'completed' && task.scrapedItems > 0
  ) || (tasks as any[])?.[0];
  
  const recentTaskId = recentTask?.id;

  const { data: scrapedData, isLoading, refetch } = useQuery<ScrapedDataItem[]>({
    queryKey: ["/api/tasks", recentTaskId, "data"],
    enabled: !!recentTaskId,
  });

  // Filter and search data
  const filteredData = scrapedData?.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const title = String(item.data.title || '').toLowerCase();
    const description = String(item.data.description || '').toLowerCase();
    const price = String(item.data.price || '').toLowerCase();
    return title.includes(searchLower) || description.includes(searchLower) || price.includes(searchLower);
  }) || [];

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a.data[sortField] || (a as any)[sortField] || '';
    let bValue = b.data[sortField] || (b as any)[sortField] || '';
    
    // Handle date sorting
    if (sortField === 'scrapedAt') {
      aValue = new Date(a.scrapedAt).getTime();
      bValue = new Date(b.scrapedAt).getTime();
    }
    
    // Handle numeric sorting
    if (sortField === 'price') {
      aValue = parseFloat(String(aValue).replace(/[^0-9.]/g, '')) || 0;
      bValue = parseFloat(String(bValue).replace(/[^0-9.]/g, '')) || 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = sortedData.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await apiRequest("PUT", `/api/data/${id}`, { data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", recentTaskId, "data"] });
      setEditingId(null);
      setEditData({});
      toast({
        title: "Data Updated",
        description: "Scraped data updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update data",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", recentTaskId, "data"] });
      toast({
        title: "Data Deleted",
        description: "Scraped data deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete data",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    if (!recentTaskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${recentTaskId}/export?format=json`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped-data-${recentTaskId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Complete",
          description: "JSON file downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export JSON file",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: ScrapedDataItem) => {
    setEditingId(item.id);
    setEditData(item.data);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Recent Scraped Data</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {recentTask ? `From: ${recentTask.name}` : 'No recent task available'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48 bg-input border-border text-foreground"
                data-testid="input-search-data"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={showFilters ? "bg-primary/10" : ""}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Select value={viewMode} onValueChange={(value: 'json' | 'table') => setViewMode(value)}>
              <SelectTrigger className="w-[120px]" data-testid="select-view-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON View
                  </div>
                </SelectItem>
                <SelectItem value="table">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Table View
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleExport}
              variant="secondary"
              size="sm"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              data-testid="button-export-json"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading scraped data...
          </div>
        ) : !scrapedData || scrapedData.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No scraped data available. Start a scraping task to see results here.
          </div>
        ) : viewMode === 'json' ? (
          <div className="p-2 space-y-1 max-h-[350px] overflow-y-auto">
            {currentData.map((item, index) => (
              <div key={item.id} className="border border-border rounded p-2 bg-muted/5 hover:bg-muted/10 transition-colors max-w-full" data-testid={`json-item-${item.id}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs py-0 px-1 h-5">
                      #{startIndex + index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                      {item.data.title || item.data.name || "No title"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.scrapedAt).toLocaleTimeString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="text-muted-foreground hover:text-foreground h-5 w-5 p-0"
                      data-testid={`button-edit-json-${item.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive h-5 w-5 p-0"
                      data-testid={`button-delete-json-${item.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-background border border-border rounded text-xs font-mono overflow-hidden max-h-28">
                      <pre className="whitespace-pre-wrap break-words">{JSON.stringify(editData, null, 1)}</pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="h-6 px-2 text-xs"
                        data-testid={`button-save-json-${item.id}`}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        className="h-6 px-2 text-xs"
                        data-testid={`button-cancel-json-${item.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-background border border-border rounded text-xs font-mono overflow-hidden max-h-20">
                    <pre className="text-foreground leading-tight whitespace-pre-wrap break-words overflow-hidden">{JSON.stringify(item.data, null, 1)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead 
                    className="text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => {
                      if (sortField === 'title') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('title');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Item
                      {sortField === 'title' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => {
                      if (sortField === 'price') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('price');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Price
                      {sortField === 'price' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">URL</TableHead>
                  <TableHead 
                    className="text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => {
                      if (sortField === 'scrapedAt') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('scrapedAt');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Scraped At
                      {sortField === 'scrapedAt' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="border-t border-border hover:bg-muted/20 transition-colors"
                    data-testid={`row-data-${item.id}`}
                  >
                    <TableCell className="p-4">
                      {editingId === item.id ? (
                        <Input
                          value={editData.title || editData.name || ""}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="bg-input border-border text-foreground"
                          data-testid={`input-edit-title-${item.id}`}
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-foreground" data-testid={`text-item-title-${item.id}`}>
                            {item.data.title || item.data.name || "No title"}
                          </div>
                          {item.data.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {item.data.description}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-4">
                      {editingId === item.id ? (
                        <Input
                          value={editData.price || ""}
                          onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                          className="bg-input border-border text-foreground"
                          data-testid={`input-edit-price-${item.id}`}
                        />
                      ) : (
                        <span className="font-medium text-foreground" data-testid={`text-item-price-${item.id}`}>
                          {item.data.price || "N/A"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm truncate max-w-xs block flex items-center gap-1"
                        data-testid={`link-item-url-${item.id}`}
                      >
                        {new URL(item.url).hostname}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground" data-testid={`text-scraped-time-${item.id}`}>
                      {formatDate(item.scrapedAt)}
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex items-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${item.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              data-testid={`button-cancel-${item.id}`}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {totalItems > 0 && (
          <div className="px-3 py-2 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground" data-testid="text-pagination-info">
                <span className="font-medium text-foreground">{startIndex + 1}-{endIndex}</span> of <span className="font-medium text-foreground">{totalItems}</span>
              </span>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={handlePreviousPage}
                  className="h-6 px-2 text-xs"
                  data-testid="button-previous-page"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                
                <span className="text-xs text-muted-foreground px-2">
                  {currentPage}/{totalPages}
                </span>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={handleNextPage}
                  className="h-6 px-2 text-xs"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
