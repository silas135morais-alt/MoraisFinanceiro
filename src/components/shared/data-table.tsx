import type { ReactNode } from "react";

type DataTableProps = {
  columns: string[];
  rows: ReactNode[][];
};

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={index} className="border-t">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td className="px-5 py-8 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
