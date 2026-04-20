"use client"

import * as React from "react"
import type { Row, Table as TableInstance } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"

import { cn } from "@/shared/lib/utils/cn"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

interface ResponsiveDataListProps<TData> {
  table: TableInstance<TData>
  renderMobileCard: (row: Row<TData>) => React.ReactNode
  emptyState?: React.ReactNode
  mobileClassName?: string
  desktopClassName?: string
}

export function ResponsiveDataList<TData>({
  table,
  renderMobileCard,
  emptyState = "Nenhum item encontrado",
  mobileClassName,
  desktopClassName,
}: ResponsiveDataListProps<TData>) {
  const isMobile = useIsMobile()
  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const columnCount = table.getAllColumns().length

  if (isMobile) {
    if (rows.length === 0) {
      return (
        <div
          className={cn(
            "rounded-md border p-6 text-center text-sm text-muted-foreground",
            mobileClassName,
          )}
        >
          {emptyState}
        </div>
      )
    }
    return (
      <div className={cn("flex flex-col gap-3", mobileClassName)}>
        {rows.map((row) => (
          <React.Fragment key={row.id}>
            {renderMobileCard(row)}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("rounded-md border", desktopClassName)}>
      <Table>
        <TableHeader>
          {headerGroups.map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyState}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
