import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, AlertTriangle, Users, Settings } from "lucide-react";

export default function AdminPage() {
  const [location] = useLocation();
  const defaultTab = location.includes("guardrails") ? "guardrails" : "users";

  return (
    <AppLayout title="Admin">
      <div className="max-w-3xl mx-auto">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="guardrails" className="flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Guardrail Review
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users size={14} />
              Users
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1.5">
              <Settings size={14} />
              Approver Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guardrails">
            <GuardrailsTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="config">
            <ApproverConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function GuardrailsTab() {
  const guardrailsQuery = trpc.guardrails.listPending.useQuery(undefined, { refetchInterval: 30000 });
  const resolveMutation = trpc.guardrails.resolve.useMutation({
    onSuccess: () => {
      toast.success("Guardrail flag resolved.");
      guardrailsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reviews = guardrailsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These posts have been flagged by the automated guardrail system. Review each flag and resolve
        it if you determine it is a false positive or acceptable. Blocking flags prevent approval routing
        until all are resolved.
      </p>

      {guardrailsQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CheckCircle size={28} className="text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No pending guardrail flags.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((item) => (
            <Card
              key={item.review.id}
              className={`border ${item.review.severity === "block" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-xs ${item.review.severity === "block" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                      >
                        {item.review.severity === "block" ? "BLOCKING" : "WARNING"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{item.review.flagType}</span>
                    </div>
                    <p className="text-sm text-foreground">{item.review.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Post #{item.review.postId} · Job #{item.job.id}: {item.job.topic.slice(0, 60)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => resolveMutation.mutate({ reviewId: item.review.id })}
                    disabled={resolveMutation.isPending}
                  >
                    {resolveMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle size={13} className="mr-1.5" />
                    )}
                    Resolve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const usersQuery = trpc.admin.listUsers.useQuery();
  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated.");
      usersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage user roles. Admins (David and Danny) can access the approval queue, guardrail review,
        and admin panel. Standard users can only submit content ideas.
      </p>

      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="border-border">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {(user.name ?? "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email ?? user.openId}</p>
                  </div>
                  <Select
                    value={user.role}
                    onValueChange={(role) =>
                      setRoleMutation.mutate({ userId: user.id, role: role as "user" | "admin" })
                    }
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ApproverConfigTab() {
  const configQuery = trpc.admin.getApproverConfig.useQuery();
  const updateMutation = trpc.admin.updateApproverConfig.useMutation({
    onSuccess: () => {
      toast.success("Approver config updated.");
      configQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const configs = configQuery.data ?? [];

  const [editValues, setEditValues] = useState<Record<string, { name: string; email: string }>>({});

  const getValues = (approverRole: string, defaults: { name: string; email: string }) => {
    return editValues[approverRole] ?? defaults;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure the name and email address for each approver. These are used for approval routing
        and email notifications.
      </p>

      {configQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => {
            const vals = getValues(config.approverRole, { name: config.name, email: config.email });
            return (
              <Card key={config.approverRole} className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm capitalize">
                    {config.approverRole === "david" ? "David Tomlinson" : "Danny Tomlinson"}
                    <Badge variant="outline" className="ml-2 text-xs capitalize">{config.approverRole}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={vals.name}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [config.approverRole]: { ...vals, name: e.target.value },
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      type="email"
                      value={vals.email}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [config.approverRole]: { ...vals, email: e.target.value },
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateMutation.mutate({
                        role: config.approverRole as "danny" | "david",
                        name: vals.name,
                        email: vals.email,
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={13} className="mr-1.5 animate-spin" />
                    ) : null}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
