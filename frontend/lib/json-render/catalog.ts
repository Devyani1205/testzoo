import { z } from 'zod';

// ============================================================================
// CATALOG: Define Zod schemas for all custom components and actions
// ============================================================================

// ─── Component Schemas ───────────────────────────────────────────────────

export const PriceBreakdownCardPropsSchema = z.object({
  test_id: z.string().min(1, 'test_id is required'),
  name: z.string().min(1, 'Test name is required'),
  mrp: z.number().positive('MRP must be positive'),
  patient_price: z.number().nonnegative('Patient price cannot be negative'),
  savings: z.number().nonnegative('Savings cannot be negative'),
  discount_percent: z.number().min(0).max(100, 'Discount must be 0-100%'),
  lab_name: z.string().optional(),
  clinical_note: z.string().optional(),
});
export type PriceBreakdownCardProps = z.infer<typeof PriceBreakdownCardPropsSchema>;

export const AlertBoxPropsSchema = z.object({
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1, 'Alert title is required'),
  message: z.string().min(1, 'Alert message is required'),
  dismissible: z.boolean().optional().default(false),
});
export type AlertBoxProps = z.infer<typeof AlertBoxPropsSchema>;

export const TestCardPropsSchema = z.object({
  test_id: z.string().min(1, 'test_id is required'),
  name: z.string().min(1, 'Test name is required'),
  category: z.string().optional(),
  biomarkers: z.array(z.string()).optional().default([]),
  turnaround_days: z.number().positive().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  sponsored: z.boolean().optional().default(false),
});
export type TestCardProps = z.infer<typeof TestCardPropsSchema>;

export const RecommendationGridPropsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  tests: z.array(TestCardPropsSchema),
  isLoading: z.boolean().optional().default(false),
});
export type RecommendationGridProps = z.infer<typeof RecommendationGridPropsSchema>;

export const ButtonPropsSchema = z.object({
  label: z.string().min(1, 'Button label is required'),
  variant: z.enum(['primary', 'secondary', 'danger']).optional().default('primary'),
  size: z.enum(['sm', 'md', 'lg']).optional().default('md'),
  disabled: z.boolean().optional().default(false),
  onClick: z.string().optional(), // Action name to trigger
});
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

// ─── Action Schemas ─────────────────────────────────────────────────────

export const ShareTestActionSchema = z.object({
  type: z.literal('share_test'),
  test_id: z.string().min(1),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
});
export type ShareTestAction = z.infer<typeof ShareTestActionSchema>;

export const ViewDetailsActionSchema = z.object({
  type: z.literal('view_details'),
  test_id: z.string().min(1),
});
export type ViewDetailsAction = z.infer<typeof ViewDetailsActionSchema>;

export const ApplyPromoActionSchema = z.object({
  type: z.literal('apply_promo'),
  promo_code: z.string().min(1),
  test_id: z.string().min(1),
});
export type ApplyPromoAction = z.infer<typeof ApplyPromoActionSchema>;

export const ActionSchema = z.discriminatedUnion('type', [
  ShareTestActionSchema,
  ViewDetailsActionSchema,
  ApplyPromoActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

// ─── Root Component Spec Schema ───────────────────────────────────────

export const ComponentSpecSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PriceBreakdownCard'),
    props: PriceBreakdownCardPropsSchema,
  }),
  z.object({
    type: z.literal('AlertBox'),
    props: AlertBoxPropsSchema,
  }),
  z.object({
    type: z.literal('TestCard'),
    props: TestCardPropsSchema,
  }),
  z.object({
    type: z.literal('RecommendationGrid'),
    props: RecommendationGridPropsSchema,
  }),
  z.object({
    type: z.literal('Button'),
    props: ButtonPropsSchema,
  }),
]);
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

// ─── Container for streaming specs ─────────────────────────────────────

export const StreamChunkSchema = z.union([
  z.object({
    type: z.literal('component'),
    component: ComponentSpecSchema,
  }),
  z.object({
    type: z.literal('action'),
    action: ActionSchema,
  }),
  z.object({
    type: z.literal('complete'),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
  }),
]);
export type StreamChunk = z.infer<typeof StreamChunkSchema>;
