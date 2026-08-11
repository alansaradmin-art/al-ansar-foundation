import { z } from 'zod'
import { phoneSchema } from './common.schema'

export const managerFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required.'),
  phone: phoneSchema,
  email: z.string().trim().email('Enter a valid email.'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export type ManagerFormValues = z.infer<typeof managerFormSchema>
