import * as React from "react"

import { cn } from "@/lib/utils"

/** The one shared table primitive — every admin table wrapped the same
 * "overflow-x-auto rounded-xl border bg-card shadow-sm" card container and
 * "bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"
 * header by hand-copying the classes; this centralizes that so a future
 * table page picks it up automatically. className on Table merges onto the
 * outer scroll/card container (e.g. to add "hidden md:block"); TableRow is
 * a plain passthrough so existing "border-b last:border-0" body-row classes
 * keep working unchanged, and the header row stays borderless as before. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border bg-card shadow-sm", className)}>
      <table data-slot="table" className="w-full text-sm" {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={className} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th data-slot="table-head" className={cn("p-3 font-medium", className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("p-3", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
