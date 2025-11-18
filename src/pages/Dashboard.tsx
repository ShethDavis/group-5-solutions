import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, userRole } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id, userRole],
    queryFn: async () => {
      if (!user) return null;

      const [employeesRes, leaveRequestsRes, attendanceRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact" }),
        supabase.from("leave_requests").select("id, status", { count: "exact" }),
        supabase
          .from("attendance")
          .select("id, status", { count: "exact" })
          .gte("date", new Date(new Date().setDate(1)).toISOString()),
      ]);

      const pendingLeave = leaveRequestsRes.data?.filter(
        (req) => req.status === "pending"
      ).length || 0;

      const todayPresent = attendanceRes.data?.filter(
        (att) => att.status === "present"
      ).length || 0;

      return {
        totalEmployees: employeesRes.count || 0,
        pendingLeaveRequests: pendingLeave,
        totalLeaveRequests: leaveRequestsRes.count || 0,
        attendanceToday: todayPresent,
      };
    },
    enabled: !!user,
  });

  const isHROrAdmin = userRole === "hr" || userRole === "admin";
  const isDepartmentHead = userRole === "department_head";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's your overview for today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px]" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEmployees}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <AlertCircle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingLeaveRequests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalLeaveRequests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.attendanceToday}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(isHROrAdmin || isDepartmentHead) && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>
                View and manage employee profiles and records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/employees">
                <Button className="w-full">Manage Employees</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Clock className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Attendance</CardTitle>
            <CardDescription>
              Track daily attendance and working hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/attendance">
              <Button className="w-full">View Attendance</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Calendar className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>
              Submit and manage leave applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/leave-requests">
              <Button className="w-full">Manage Leaves</Button>
            </Link>
          </CardContent>
        </Card>

        {(isHROrAdmin || isDepartmentHead) && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>
                Document and track employee performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/performance">
                <Button className="w-full">View Reviews</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isHROrAdmin && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate staffing and performance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reports">
                <Button className="w-full">View Reports</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
