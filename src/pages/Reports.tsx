import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Reports() {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [employeesRes, leaveRes, attendanceRes, reviewsRes] = await Promise.all([
        supabase.from("employees").select("id, department", { count: "exact" }),
        supabase.from("leave_requests").select("status", { count: "exact" }),
        supabase
          .from("attendance")
          .select("status", { count: "exact" })
          .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()),
        supabase.from("performance_reviews").select("rating", { count: "exact" }),
      ]);

      const departmentBreakdown = employeesRes.data?.reduce((acc: any, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
      }, {});

      const avgRating =
        reviewsRes.data && reviewsRes.data.length > 0
          ? (
              reviewsRes.data.reduce((sum, r) => sum + (r.rating || 0), 0) /
              reviewsRes.data.length
            ).toFixed(1)
          : "N/A";

      return {
        totalEmployees: employeesRes.count || 0,
        departmentBreakdown,
        pendingLeave: leaveRes.data?.filter((r) => r.status === "pending").length || 0,
        attendanceRate:
          attendanceRes.data && attendanceRes.count
            ? (
                (attendanceRes.data.filter((a) => a.status === "present").length /
                  attendanceRes.count) *
                100
              ).toFixed(1)
            : "0",
        avgPerformanceRating: avgRating,
        totalReviews: reviewsRes.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            View staffing levels, absenteeism, and performance metrics
          </p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Reports
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px]" />
                <Skeleton className="h-3 w-[100px] mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Across all departments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Leave</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.pendingLeave}</div>
                <p className="text-xs text-muted-foreground">Requests awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.avgPerformanceRating}/5.0</div>
                <p className="text-xs text-muted-foreground">
                  Based on {reportData?.totalReviews} reviews
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Breakdown</CardTitle>
          <CardDescription>Employee distribution across departments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          ) : reportData?.departmentBreakdown ? (
            <div className="space-y-4">
              {Object.entries(reportData.departmentBreakdown).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{dept}</span>
                  </div>
                  <span className="text-muted-foreground">{count as number} employees</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
