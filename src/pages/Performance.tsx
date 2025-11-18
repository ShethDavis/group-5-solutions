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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Performance() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select(`
          *,
          employees!inner(
            employee_number,
            department,
            position,
            profiles:user_id(full_name)
          ),
          reviewer:reviewer_id(full_name)
        `)
        .order("review_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-warning text-warning" : "text-muted"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Document and track employee performance evaluations
          </p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          New Review
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>
            All performance evaluations and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">
                        {review.employees.profiles?.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {review.employees.department}
                        </Badge>
                      </TableCell>
                      <TableCell>{review.employees.position}</TableCell>
                      <TableCell>
                        {new Date(review.review_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {review.rating && getRatingStars(review.rating)}
                        </div>
                      </TableCell>
                      <TableCell>{review.reviewer?.full_name}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No performance reviews found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
