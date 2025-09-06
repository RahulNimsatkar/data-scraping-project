import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiKeysPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const { toast } = useToast();

  const mockApiKeys = [
    { id: "1", name: "Production API", key: "sk-1234567890abcdef", created: "2024-01-15", lastUsed: "2024-01-20", status: "active" },
    { id: "2", name: "Development API", key: "sk-abcdef1234567890", created: "2024-01-10", lastUsed: "2024-01-19", status: "active" },
    { id: "3", name: "Testing API", key: "sk-fedcba0987654321", created: "2024-01-05", lastUsed: "Never", status: "inactive" },
  ];

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "API key copied!",
      description: "The API key has been copied to your clipboard.",
    });
  };

  const createNewKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the API key.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "API key created!",
      description: `New API key "${newKeyName}" has been created.`,
    });
    setNewKeyName("");
  };

  const deleteKey = (keyName: string) => {
    toast({
      title: "API key deleted",
      description: `API key "${keyName}" has been permanently deleted.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
              <p className="text-muted-foreground">Manage your API keys and access tokens</p>
            </div>
            <Button onClick={createNewKey}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Key
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Create New Key */}
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
              <CardDescription>Generate a new API key for programmatic access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter API key name..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="max-w-md"
                />
                <Button onClick={createNewKey}>
                  <Key className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Keys List */}
          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>Manage and monitor your existing API keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockApiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{apiKey.name}</h3>
                          <Badge variant={apiKey.status === "active" ? "default" : "secondary"}>
                            {apiKey.status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {apiKey.created}</span>
                          <span>Last used: {apiKey.lastUsed}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="font-mono text-sm bg-muted p-2 rounded flex-1 max-w-md">
                            {showKeys[apiKey.id] ? apiKey.key : "sk-" + "•".repeat(16)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {showKeys[apiKey.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.key)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{apiKey.name}"? This action cannot be undone and will immediately revoke access for this key.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteKey(apiKey.name)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>Current month statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">15,420</div>
                    <p className="text-sm text-muted-foreground">API calls this month</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">94.2%</div>
                    <p className="text-sm text-muted-foreground">Success rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li>• Keep your API keys secure and never share them</li>
                  <li>• Use different keys for different environments</li>
                  <li>• Rotate your keys regularly</li>
                  <li>• Monitor usage for suspicious activity</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}