import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Upload, CircleCheck, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/StateViews'
import { useManagers } from '@/hooks/useManagers'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { useQueryClient } from '@tanstack/react-query'
import { parseCsv } from '@/lib/csv'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { guessColumnMapping } from '@/features/members/import/columnMapping'
import { importRowSchema, IMPORT_COLUMNS, type ImportRow } from '@/schemas/import.schema'

type Step = 'upload' | 'mapping' | 'preview' | 'done'

interface PreviewRow {
  data: ImportRow
  managerId: string | null
  errors: string[]
}

export default function ImportPage() {
  const navigate = useNavigate()
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  const { data: managers = [] } = useManagers()

  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, keyof ImportRow | null>>({})
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  async function handleFile(file: File) {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) {
      toast.error('That file has no data rows.')
      return
    }
    const [headerRow, ...rest] = rows
    setHeaders(headerRow)
    setDataRows(rest)
    setMapping(guessColumnMapping(headerRow))
    setStep('mapping')
  }

  async function buildPreview() {
    const mappedRows: ImportRow[] = dataRows.map((row) => {
      const record: Partial<ImportRow> = {}
      headers.forEach((_, index) => {
        const field = mapping[index]
        if (field) {
          ;(record as Record<string, string>)[field] = (row[index] ?? '').trim()
        }
      })
      return record as ImportRow
    })

    const seenIds = new Set<string>()
    const fileMemberIds = mappedRows.map((r) => r.member_id).filter(Boolean)
    const { data: existing } = await client
      .from('members')
      .select('member_id')
      .in('member_id', fileMemberIds.length > 0 ? fileMemberIds : [''])
    const existingIds = new Set((existing ?? []).map((m) => m.member_id))

    const rows: PreviewRow[] = mappedRows.map((raw) => {
      const errors: string[] = []
      const parsed = importRowSchema.safeParse(raw)
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errors.push(issue.message)
      }

      const memberId = raw.member_id?.trim()
      if (memberId) {
        if (existingIds.has(memberId)) errors.push('Member ID already exists in the system.')
        if (seenIds.has(memberId)) errors.push('Duplicate Member ID within this file.')
        seenIds.add(memberId)
      }

      let managerId: string | null = null
      if (raw.assigned_manager?.trim()) {
        const found = managers.find(
          (m) => m.full_name.toLowerCase() === raw.assigned_manager!.trim().toLowerCase(),
        )
        if (found) managerId = found.id
        else errors.push(`Manager "${raw.assigned_manager}" not found.`)
      }

      return { data: parsed.success ? parsed.data : raw, managerId, errors }
    })

    setPreview(rows)
    setStep('preview')
  }

  async function handleImport() {
    const validRows = preview.filter((r) => r.errors.length === 0)
    if (validRows.length === 0) return
    setIsImporting(true)
    try {
      const { error } = await client.from('members').insert(
        validRows.map((r) => ({
          member_id: r.data.member_id,
          member_name: r.data.member_name,
          father_name: r.data.father_name || null,
          mobile_number: r.data.mobile_number || null,
          address: r.data.address || null,
          added_by_type: r.data.added_by_name ? ('EXTERNAL_CONTACT' as const) : null,
          added_by_name: r.data.added_by_name || null,
          added_by_phone: r.data.added_by_phone || null,
          reference_contact_type: r.data.reference_contact_name ? ('EXTERNAL_CONTACT' as const) : null,
          reference_contact_name: r.data.reference_contact_name || null,
          reference_contact_phone: r.data.reference_contact_phone || null,
          reference_contact_relationship: r.data.reference_contact_relationship || null,
          assigned_manager_id: r.managerId,
          status: r.data.status ?? 'ACTIVE',
        })),
      )
      if (error) throw error
      setImportedCount(validRows.length)
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setStep('done')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Import failed. No records were saved.'))
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = preview.filter((r) => r.errors.length === 0).length
  const errorCount = preview.length - validCount

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/members')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Import Members</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
          <Upload className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with your member list. The first row must contain column headers.
          </p>
          <div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mx-auto block text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Match each column from your file to a field. Columns set to "Ignore" won't be imported.
          </p>
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="text-sm font-medium">{header}</span>
                <Select
                  value={mapping[index] ?? 'IGNORE'}
                  onValueChange={(v) =>
                    setMapping((prev) => ({ ...prev, [index]: v === 'IGNORE' ? null : (v as keyof ImportRow) }))
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IGNORE">Ignore this column</SelectItem>
                    {IMPORT_COLUMNS.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.label}
                        {col.required ? ' *' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <Button onClick={buildPreview}>Preview Import</Button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{validCount} ready to import</Badge>
            {errorCount > 0 && <Badge variant="outline">{errorCount} with errors (will be skipped)</Badge>}
          </div>

          <div className="max-h-112 space-y-2 overflow-y-auto">
            {preview.map((row, index) => (
              <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                {row.errors.length === 0 ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {row.data.member_name || <span className="text-muted-foreground">(no name)</span>}
                    {row.data.member_id ? ` · ${row.data.member_id}` : ''}
                  </p>
                  {row.errors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs text-destructive">
                      {row.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={validCount === 0 || isImporting}>
              {isImporting ? 'Importing…' : `Import ${validCount} Member${validCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 rounded-lg border p-8 text-center">
          <CircleCheck className="mx-auto size-8 text-primary" />
          <p className="font-medium">{importedCount} member(s) imported successfully.</p>
          <Button onClick={() => navigate('/admin/members')}>Go to Members</Button>
        </div>
      )}

      {isImporting && step === 'preview' && <LoadingState label="Importing…" />}
    </div>
  )
}
