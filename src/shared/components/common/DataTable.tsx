import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "@/shared/utils/cn";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnDef<TData> {
  /** Unique key for the column. */
  key: string;
  /** Column header label. */
  header: string;
  /** Renders the cell content for a given row. */
  cell: (row: TData) => ReactNode;
  /** Optional class names for the <th> and <td> elements. */
  className?: string;
  /** Hide this column on mobile (< lg). */
  hideOnMobile?: boolean;
}

interface DataTableProps<TData> {
  /** Column definitions. */
  columns: ColumnDef<TData>[];
  /** Row data. Pass an empty array when loading. */
  data: TData[];
  /** Unique key extractor for React list reconciliation. */
  keyExtractor: (row: TData) => string;
  /** Whether data is currently loading. Shows skeleton rows. */
  isLoading?: boolean;
  /** Number of skeleton rows to show while loading. Defaults to 5. */
  skeletonRows?: number;
  /** Enables a search input. Provide a filter function to control matching. */
  searchable?: boolean;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /**
   * Filter function applied when the user types in the search box.
   * @param row - A data row
   * @param query - The current search string (lowercased)
   * @returns true if the row should be shown
   */
  filterFn?: (row: TData, query: string) => boolean;
  /** Enables client-side pagination. */
  paginated?: boolean;
  /** Number of rows per page. Defaults to 10. */
  pageSize?: number;
  /** Called when a row is clicked. */
  onRowClick?: (row: TData) => void;
  /** Content shown when there are no results. Replaces default EmptyState. */
  emptyState?: ReactNode;
  /** Title shown in the default EmptyState. */
  emptyTitle?: string;
  /** Description shown in the default EmptyState. */
  emptyDescription?: string;
  /** Additional class names for the table wrapper. */
  className?: string;
}

/**
 * Generic, typed data table with optional search, pagination, loading skeletons,
 * and empty state — used across all list pages.
 *
 * @example
 * <DataTable
 *   columns={clientColumns}
 *   data={clients}
 *   keyExtractor={(c) => c.id}
 *   isLoading={isLoading}
 *   searchable
 *   searchPlaceholder="Search clients…"
 *   filterFn={(c, q) => c.full_name.toLowerCase().includes(q)}
 *   paginated
 *   onRowClick={(c) => navigate(`/client/${c.id}`)}
 *   emptyTitle="No clients yet"
 *   emptyDescription="Add your first client to get started."
 * />
 */
export function DataTable<TData>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  skeletonRows = 5,
  searchable = false,
  searchPlaceholder = "Search…",
  filterFn,
  paginated = false,
  pageSize = 10,
  onRowClick,
  emptyState,
  emptyTitle = "No results found",
  emptyDescription,
  className,
}: DataTableProps<TData>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filteredData = useMemo(() => {
    if (!search || !filterFn) return data;
    return data.filter((row) => filterFn(row, search.toLowerCase()));
  }, [data, search, filterFn]);

  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData;
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, paginated, page, pageSize]);

  const totalPages = paginated ? Math.ceil(filteredData.length / pageSize) : 1;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.hideOnMobile && "hidden lg:table-cell", col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.hideOnMobile && "hidden lg:table-cell", col.className)}
                    >
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.hideOnMobile && "hidden lg:table-cell", col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredData.length} result{filteredData.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
