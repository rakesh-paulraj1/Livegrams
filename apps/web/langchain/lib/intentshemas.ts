import { z } from "zod";

const BaseIntent = z.object({});

const CreateShape = z.object({
  intent: z.literal("create"),
  shapes: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string(),
      x: z.number().optional(),
      y: z.number().optional(),
      props: z.record(z.any()).optional(),
    })
  ),
  reply: z.string().optional(),
});

const EditShape = z.object({
  intent: z.literal("edit"),
  id: z.string(),
  props: z.record(z.any()),
  reply: z.string().optional(),
});

const DeleteIntent = z.object({
  intent: z.literal("delete"),
  ids: z.array(z.string()),
  reply: z.string().optional(),
});

const DeleteAll = z.object({
  intent: z.literal("delete_all"),
  reply: z.string().optional(),
});

const Batch = z.object({
  intent: z.literal("batch"),
  actions: z.array(z.any()),
  reply: z.string().optional(),
});

export const IntentSchema = z.discriminatedUnion("intent", [
  CreateShape,
  EditShape,
  DeleteIntent,
  DeleteAll,
  Batch,
]);

export type Intent = z.infer<typeof IntentSchema>;