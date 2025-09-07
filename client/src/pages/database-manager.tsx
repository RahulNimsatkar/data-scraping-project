import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { 
  Database, 
  Plus, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Settings,
  Server,
  Shield
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { DatabaseConnection } from "@shared/schema";

interface DatabaseFormData {
  name: string;
  type: "mongodb" | "postgresql" | "mysql";
  url: string;
  username: string;
  password: string;
  database: string;
  isDefault: boolean;
}

export default function DatabaseManagerPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingDb, setEditingDb] = useState<DatabaseConnection | null>(null);
  const [formData, setFormData] = useState<DatabaseFormData>({
    name: "",
    type: "mongodb",
    url: "",
    username: "",
    password: "",
    database: "",
    isDefault: false,
  });

  const { data: databases = [], isLoading } = useQuery<DatabaseConnection[]>({
    queryKey: ["/api/databases"],
  });

  const addDatabaseMutation = useMutation({
    mutationFn: (data: DatabaseFormData) => apiRequest("POST", "/api/databases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      setShowForm(false);
      setFormData({
        name: "",
        type: "mongodb",
        url: "",
        username: "",
        password: "",
        database: "",
        isDefault: false,
      });
      toast({ title: "Success", description: "Database connection added successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add database connection",
        variant: "destructive"
      });
    },
  });

  const updateDatabaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DatabaseFormData> }) => 
      apiRequest("PATCH", `/api/databases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      setEditingDb(null);
      toast({ title: "Success", description: "Database connection updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update database connection",
        variant: "destructive"
      });
    },
  });

  const deleteDatabaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/databases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      toast({ title: "Success", description: "Database connection removed successfully!" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/databases/${id}/test`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      toast({ 
        title: "Connection Test", 
        description: data.success ? "Connection successful!" : `Connection failed: ${data.error}`,
        variant: data.success ? "default" : "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDb) {
      updateDatabaseMutation.mutate({ id: editingDb.id!, data: formData });
    } else {
      addDatabaseMutation.mutate(formData);
    }
  };

  const handleEdit = (db: DatabaseConnection) => {
    setEditingDb(db);
    setFormData({
      name: db.name,
      type: db.type,
      url: db.url,
      username: db.username || "",
      password: db.password || "",
      database: db.database || "",
      isDefault: db.isDefault,
    });
    setShowForm(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getConnectionString = (type: string) => {
    switch (type) {
      case "mongodb":
        return "mongodb://username:password@host:port/database\nmongodb+srv://username:password@cluster.mongodb.net/database";
      case "postgresql":
        return "postgresql://username:password@host:port/database\npostgres://username:password@host:port/database";
      case "mysql":
        return "mysql://username:password@host:port/database";
      default:
        return "";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-8 h-8" />
                Database Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage multiple database connections and automatically integrate them with your backend
              </p>
            </div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2"
              data-testid="button-add-database"
            >
              <Plus className="w-4 h-4" />
              Add Database
            </Button>
          </div>

          {showForm && (
            <Card className="mb-6" data-testid="card-database-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {editingDb ? "Edit Database Connection" : "Add New Database Connection"}
                </CardTitle>
                <CardDescription>
                  Configure a new database connection. Supported types: MongoDB, PostgreSQL, MySQL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Connection Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Production MongoDB"
                        required
                        data-testid="input-database-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Database Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "mongodb" | "postgresql" | "mysql") =>
                          setFormData({ ...formData, type: value })
                        }
                        data-testid="select-database-type"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="url">Database URL</Label>
                    <Textarea
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder={getConnectionString(formData.type)}
                      className="font-mono text-sm"
                      rows={2}
                      required
                      data-testid="input-database-url"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Full connection string including credentials, or use separate fields below
                    </p>
                  </div>

                  <Separator />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Optional: Separate Connection Details
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="database username"
                        data-testid="input-database-username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="database password"
                        data-testid="input-database-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="database">Database Name</Label>
                      <Input
                        id="database"
                        value={formData.database}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                        placeholder="database name"
                        data-testid="input-database-name-field"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                      data-testid="switch-default-database"
                    />
                    <Label htmlFor="isDefault">Set as default database</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={addDatabaseMutation.isPending || updateDatabaseMutation.isPending}
                      data-testid="button-save-database"
                    >
                      {editingDb ? "Update Connection" : "Add Connection"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingDb(null);
                        setFormData({
                          name: "",
                          type: "mongodb",
                          url: "",
                          username: "",
                          password: "",
                          database: "",
                          isDefault: false,
                        });
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p>Loading database connections...</p>
                </CardContent>
              </Card>
            ) : databases.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Database Connections</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Add your first database connection to get started with data persistence.
                  </p>
                  <Button onClick={() => setShowForm(true)} data-testid="button-add-first-database">
                    Add Database Connection
                  </Button>
                </CardContent>
              </Card>
            ) : (
              databases.map((db) => (
                <Card key={db.id} className="hover:shadow-md transition-shadow" data-testid={`card-database-${db.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {db.name}
                            {db.isDefault && <Badge variant="secondary">Default</Badge>}
                            {getStatusIcon(db.status)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{db.type.toUpperCase()}</Badge>
                            <span className="text-xs">
                              {db.lastConnected ? `Last connected: ${new Date(db.lastConnected).toLocaleString()}` : "Never connected"}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(db.id!)}
                          disabled={testConnectionMutation.isPending}
                          data-testid={`button-test-${db.id}`}
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(db)}
                          data-testid={`button-edit-${db.id}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDatabaseMutation.mutate(db.id!)}
                          disabled={deleteDatabaseMutation.isPending}
                          data-testid={`button-delete-${db.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {db.url.replace(/\/\/[^@]*@/, "//***:***@")}
                        </span>
                      </div>
                      {db.status === "error" && db.errorMessage && (
                        <Alert>
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription className="text-sm">
                            {db.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Alert className="mt-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>How it works:</strong> When you add a database connection, it will be automatically integrated with your backend. 
              Set one as default to use it as the primary data store. You can test connections to ensure they're working properly.
              All credentials are securely stored and never exposed in logs.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  );
}