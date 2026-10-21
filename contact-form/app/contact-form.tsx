import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { contact, type Contact } from "./shared/contact"

const topics = [
  { value: "question", label: "A question" },
  { value: "feedback", label: "Feedback" },
  { value: "bug", label: "Something is broken" },
]

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const form = useForm<Contact>({
    resolver: standardSchemaResolver(contact),
    defaultValues: { name: "", email: "", topic: undefined, message: "", copy: false },
  })

  async function onSubmit(data: Contact) {
    const res = await fetch("/api/collections/messages/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return form.setError("root", { message: (await res.json()).message })
    setSent(true)
  }

  if (sent) return <p className="mx-auto max-w-md p-6">Thank you. We'll answer soon.</p>

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-md p-6" noValidate>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input {...field} id="name" autoComplete="name" aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input {...field} id="email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="topic"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="topic">About</FieldLabel>
              <Select items={topics} value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id="topic" className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent><SelectGroup>
                  {topics.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup></SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="message"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="message">Message</FieldLabel>
              <Textarea {...field} id="message" rows={5} aria-invalid={fieldState.invalid} />
              <FieldDescription>{field.value.length} / 1000</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="copy"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox id="copy" checked={field.value} onCheckedChange={field.onChange} />
              <FieldLabel htmlFor="copy" className="font-normal">
                Send me a copy
              </FieldLabel>
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Send
        </Button>
      </FieldGroup>
    </form>
  )
}
