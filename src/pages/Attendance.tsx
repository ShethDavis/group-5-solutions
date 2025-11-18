import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];

      const dateStr = selectedDate.toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          employees!inner(
            employee_number,
            department,
            position,
            profiles:user_id(full_name)
          )
        `)
        .eq("date", dateStr)
        .order("check_in_time");

      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "success";
      case "absent":
        return "destructive";
      case "late":
        return "warning";
      case "half_day":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Monitor daily attendance and working hours
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {selectedDate
                ? `Showing records for ${selectedDate.toLocaleDateString()}`
                : "Select a date to view records"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : attendance && attendance.length > 0 ? (
                    attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.employees.employee_number}
                        </TableCell>
                        <TableCell>{record.employees.profiles?.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.employees.department}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.employees.position}</TableCell>
                        <TableCell>
                          {record.check_in_time || "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(record.status) as any}>
                            {record.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No attendance records found for this date
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
