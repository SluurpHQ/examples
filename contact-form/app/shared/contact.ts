import { z } from "zod"

/** A message, as the form checks it in the browser and the server checks it again before it is saved. */
export const contact = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.email("Enter an email address we can answer."),
  topic: z.enum(["question", "feedback", "bug"], "Choose what it is about."),
  message: z.string().trim().min(20, "Say a little more: 20 characters at least.").max(1000, "Keep it under 1000 characters."),
  copy: z.boolean(),
})

export type Contact = z.infer<typeof contact>
