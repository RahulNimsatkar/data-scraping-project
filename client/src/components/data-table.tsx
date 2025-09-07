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
import { Download, RefreshCw, Edit, Trash2, ExternalLink, ChevronLeft, ChevronRight, Database, FileJson } from "lucide-react";
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

  // Pagination calculations
  const totalItems = scrapedData?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = scrapedData?.slice(startIndex, endIndex) || [];

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
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {currentData.map((item, index) => (
              <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/10 hover:bg-muted/20 transition-colors" data-testid={`json-item-${item.id}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Item #{startIndex + index + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      ID: {item.id.slice(-6)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.scrapedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
                        data-testid={`button-edit-json-${item.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                        data-testid={`button-delete-json-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-background border border-border rounded text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(editData, null, 2)}</pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        data-testid={`button-save-json-${item.id}`}
                      >
                        Save Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        data-testid={`button-cancel-json-${item.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-background border border-border rounded text-xs font-mono overflow-x-auto">
                      <pre className="text-foreground">{JSON.stringify(item.data, null, 2)}</pre>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Source: {new URL(item.url).hostname}</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        data-testid={`link-json-url-${item.id}`}
                      >
                        View Original <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground">Price</TableHead>
                  <TableHead className="text-muted-foreground">URL</TableHead>
                  <TableHead className="text-muted-foreground">Scraped At</TableHead>
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
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  Showing <span className="font-medium text-foreground">{startIndex + 1}-{endIndex}</span> of <span className="font-medium text-foreground">{totalItems}</span> items
                </span>
                <Badge variant="outline" className="text-xs">
                  Page {currentPage} of {totalPages}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={handlePreviousPage}
                  className="text-xs"
                  data-testid="button-previous-page"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0 text-xs"
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={handleNextPage}
                  className="text-xs"
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
