"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  pageSize = 50,
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {searchable && (
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 text-[12px] max-w-sm"
        />
      )}
      <div className="border border-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-row-alt border-b border-border-subtle">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-[11px] font-700 uppercase tracking-wider text-text-secondary select-none"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() && "cursor-pointer hover:text-text-primary"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-text-muted">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp size={12} />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronsUpDown size={11} />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-[12px] text-text-muted"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border-subtle last:border-0 hover:bg-primary/5 transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-row-alt",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row.original)
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-[12px] text-text-primary">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-[12px] text-text-secondary">
          <span>
            Showing {table.getRowModel().rows.length} of {data.length} records
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 text-[11px]"
            >
              Previous
            </Button>
            <span className="px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 text-[11px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
