import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  columnWidths?: string[];
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  columnWidths,
}: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead
                key={`th-${i}`}
                className={columnWidths?.[i] ? `w-[${columnWidths[i]}]` : undefined}
              >
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={`row-${rowIdx}`}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={`cell-${rowIdx}-${colIdx}`}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
