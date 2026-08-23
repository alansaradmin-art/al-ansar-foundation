import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CountryPhoneField } from '@/components/CountryPhoneField'
import { MemberPicker } from './MemberPicker'
import { memberFormSchema, type MemberFormValues } from '@/schemas/member.schema'
import { CONTACT_TYPES, RELATIONSHIPS } from '@/schemas/common.schema'
import { useManagers } from '@/hooks/useManagers'
import type { Member } from '@/types'

type PickedMember = Pick<Member, 'id' | 'member_name'> & Partial<Pick<Member, 'member_id'>>

const CONTACT_TYPE_LABELS: Record<(typeof CONTACT_TYPES)[number], string> = {
  REGISTERED_MEMBER: 'A registered member',
  MANAGER: 'A manager',
  EXTERNAL_CONTACT: 'Someone outside the system',
}

export function MemberForm({
  defaultValues,
  existingMemberId,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: Partial<MemberFormValues>
  /** Set only when editing — the system-generated ID, shown read-only. */
  existingMemberId?: string
  onSubmit: (values: MemberFormValues) => void
  isSubmitting: boolean
}) {
  const { data: managers = [] } = useManagers({ status: 'ACTIVE' })
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      member_name: '',
      father_name: '',
      mobile_number: '',
      address: '',
      status: 'ACTIVE',
      ...defaultValues,
    },
  })

  const addedByType = form.watch('added_by_type')
  const referenceType = form.watch('reference_contact_type')

  // MemberPicker is a controlled component — it only shows a name once we
  // hand it back the member that was picked. Previously this was hardcoded
  // to `null`, so a selection never appeared in the trigger even though the
  // underlying added_by_id/name fields were set correctly.
  const [addedByMember, setAddedByMember] = useState<PickedMember | null>(
    defaultValues?.added_by_type === 'REGISTERED_MEMBER' && defaultValues.added_by_id
      ? { id: defaultValues.added_by_id, member_name: defaultValues.added_by_name || '' }
      : null,
  )
  const [referenceMember, setReferenceMember] = useState<PickedMember | null>(
    defaultValues?.reference_contact_type === 'REGISTERED_MEMBER' && defaultValues.reference_contact_id
      ? { id: defaultValues.reference_contact_id, member_name: defaultValues.reference_contact_name || '' }
      : null,
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {existingMemberId && (
          <p className="text-sm text-muted-foreground">
            Member ID <span className="font-medium text-foreground">{existingMemberId}</span>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="member_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="father_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Father Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CountryPhoneField<MemberFormValues> countryField="mobile_country" numberField="mobile_number" />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigned_manager_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Manager</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Added By — who originally referred this member?</p>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={addedByType} onValueChange={(v) => form.setValue('added_by_type', v as MemberFormValues['added_by_type'])}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CONTACT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {addedByType === 'REGISTERED_MEMBER' && (
            <div className="space-y-2">
              <Label>Select Member</Label>
              <MemberPicker
                value={addedByMember}
                onChange={(m) => {
                  setAddedByMember(m)
                  form.setValue('added_by_id', m.id)
                  form.setValue('added_by_name', m.member_name)
                  form.setValue('added_by_phone', m.mobile_number ?? '')
                  form.setValue('added_by_country', m.mobile_country ?? undefined)
                }}
              />
            </div>
          )}

          {(addedByType === 'MANAGER' || addedByType === 'EXTERNAL_CONTACT') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="added_by_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CountryPhoneField<MemberFormValues> countryField="added_by_country" numberField="added_by_phone" numberLabel="Phone" />
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Reference Contact</p>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={referenceType}
              onValueChange={(v) => form.setValue('reference_contact_type', v as MemberFormValues['reference_contact_type'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CONTACT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {referenceType === 'REGISTERED_MEMBER' && (
            <div className="space-y-2">
              <Label>Select Member</Label>
              <MemberPicker
                value={referenceMember}
                onChange={(m) => {
                  setReferenceMember(m)
                  form.setValue('reference_contact_id', m.id)
                  form.setValue('reference_contact_name', m.member_name)
                  form.setValue('reference_contact_phone', m.mobile_number ?? '')
                  form.setValue('reference_contact_country', m.mobile_country ?? undefined)
                }}
              />
            </div>
          )}

          {(referenceType === 'MANAGER' || referenceType === 'EXTERNAL_CONTACT') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="reference_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CountryPhoneField<MemberFormValues>
                countryField="reference_contact_country"
                numberField="reference_contact_phone"
                numberLabel="Phone"
              />
            </div>
          )}

          {referenceType && (
            <FormField
              control={form.control}
              name="reference_contact_relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Member'}
        </Button>
      </form>
    </Form>
  )
}
