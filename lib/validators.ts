import { z } from "zod";

// User validators
export const userCreateSchema = z.object({
  email: z.string().email(),
  hashed_password: z.string().min(1),
  name: z.string().min(1).optional(),
  topics: z.array(z.string()).optional().nullable(),
  race: z.string().optional().nullable(),
  residency: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  age_range: z.string().optional().nullable(),
  party: z.string().optional().nullable(),
  income: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
});

export const userUpdateSchema = userCreateSchema.partial();

// Bill validators
export const billCreateSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  summary_key: z.string().optional().nullable(),
  date: z.string().date().optional().nullable(),
  status: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  sponsors: z.array(z.string()).optional().nullable(),
});

// Endorsement validators
export const endorsementCreateSchema = z.object({
  bill_id: z.string().min(1),
});

export const endorsementDeleteSchema = z.object({
  bill_id: z.string().min(1),
});

// Pagination validators
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Summary request validator
export const summaryRequestSchema = z.object({
  bill_id: z.string().min(1),
});

