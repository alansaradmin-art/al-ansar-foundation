import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  followupFormSchema,
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_METHODS,
  CONTACTED_PERSON_TYPES,
  type FollowupFormValues,
} from '@/schemas/followup.schema'
import { todayISO } from '@/lib/format'
import type { Member } from '@/types'

const STATUS_LABELS: Record<(typeof FOLLOW_UP_STATUSES)[number], string> = {
  NOT_STARTED: 'Not Started',
  COMPLETED: 'Completed',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUIRED: 'Callback Required',
  OTHER: 'Other',
}

const METHOD_LABELS: Record<(typeof FOLLOW_UP_METHODS)[number], string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

const CONTACTED_LABELS: Record<(typeof CONTACTED_PERSON_TYPES)[number], string> = {
  MEMBER: 'Member',
  ADDED_BY: 'Added By',
  REFERENCE_CONTACT: 'Reference Contact',
  OTHER: 'Someone else',
}

function contactInfoFor(member: Member, type: string) {
  if (type === 'MEMBER') return { name: member.member_name, phone: member.mobile_number, relationship: null }
  if (type === 'ADDED_BY') return { name: member.added_by_name, phone: member.added_by_phone, relationship: null }
  if (type === 'REFERENCE_CONTACT') {
    return {
      name: member.reference_contact_name,
      phone: member.reference_contact_phone,
      relationship: member.reference_contact_relationship,
    }
  }
  return null
}

export function FollowupForm({
  member,
  onSubmit,
  isSubmitting,
}: {
  member: Member
  onSubmit: (values: FollowupFormValues) => void
  isSubmitting: boolean
}) {
  const form = useForm<FollowupFormValues>({
    resolver: zodResolver(followupFormSchema),
    defaultValues: {
      member_id: member.id,
      follow_up_date: todayISO(),
      follow_up_status: 'COMPLETED',
      follow_up_method: 'PHONE',
      contacted_person_type: 'MEMBER',
      contacted_person_name: '',
      contacted_person_phone: '',
      contacted_person_relationship: '',
      remarks: '',
      next_follow_up_date: '',
    },
  })

  const contactedType = form.watch('contacted_person_type')

  function handleContactedTypeChange(type: string) {
    form.setValue('contacted_person_type', type as FollowupFormValues['contacted_person_type'])
    if (type !== 'OTHER') {
      const info = contactInfoFor(member, type)
      form.setValue('contacted_person_name', info?.name ?? '')
      form.setValue('contacted_person_phone', info?.phone ?? '')
      form.setValue('contacted_person_relationship', info?.relationship ?? '')
    } else {
      form.setValue('contacted_person_name', '')
      form.setValue('contacted_person_phone', '')
      form.setValue('contacted_person_relationship', '')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="follow_up_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Follow-up Date</FormLabel>
              <FormControl>
                <Input type="date" max={todayISO()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contacted_person_type"
          render={() => (
            <FormItem>
              <FormLabel>Who did you contact?</FormLabel>
              <Select value={contactedType} onValueChange={handleContactedTypeChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTACTED_PERSON_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTACTED_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {contactedType === 'OTHER' && (
          <>
            <FormField
              control={form.control}
              name="contacted_person_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contacted_person_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contacted_person_relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="follow_up_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FOLLOW_UP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {METHOD_LABELS[method]}
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
          name="follow_up_status"
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
                  {FOLLOW_UP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
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
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="next_follow_up_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Follow-up Date (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Follow-up'}
        </Button>
      </form>
    </Form>
  )
}
