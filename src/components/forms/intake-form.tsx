"use client";

import { useState, useRef, type FormEvent } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---- Types ---- */

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

/* ---- Validation Helpers ---- */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\-+() ]{7,15}$/;

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "שדה שם מלא הוא חובה";
  }

  if (!data.email.trim()) {
    errors.email = "שדה אימייל הוא חובה";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "כתובת אימייל לא תקינה";
  }

  if (data.phone.trim() && !PHONE_REGEX.test(data.phone)) {
    errors.phone = "מספר טלפון לא תקין";
  }

  if (!data.subject.trim()) {
    errors.subject = "שדה נושא הוא חובה";
  }

  if (!data.message.trim()) {
    errors.message = "שדה הודעה הוא חובה";
  } else if (data.message.trim().length < 10) {
    errors.message = "ההודעה חייבת להכיל לפחות 10 תווים";
  }

  return errors;
}

/* ---- Component ---- */

export default function IntakeForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setStatus("loading");
    setServerMessage("");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("שגיאה בשליחת הטופס");
      }

      setStatus("success");
      setServerMessage("הפנייה שלך התקבלה בהצלחה! ניצור עמך קשר בהקדם.");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });

      // Focus the status message for screen readers
      statusRef.current?.focus();
    } catch {
      setStatus("error");
      setServerMessage(
        "אירעה שגיאה בשליחת הטופס. אנא נסו שנית או צרו קשר טלפונית.",
      );
      statusRef.current?.focus();
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-label="טופס יצירת קשר"
    >
      <fieldset className="space-y-5">
        <legend className="sr-only">פרטי יצירת קשר</legend>

        <Input
          label="שם מלא"
          name="name"
          type="text"
          required
          aria-required="true"
          autoComplete="name"
          placeholder="הזן את שמך המלא"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
        />

        <Input
          label="אימייל"
          name="email"
          type="email"
          required
          aria-required="true"
          autoComplete="email"
          placeholder="example@email.com"
          dir="ltr"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        <Input
          label="טלפון"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="050-000-0000"
          dir="ltr"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          helperText="שדה רשות"
        />

        <Input
          label="נושא"
          name="subject"
          type="text"
          required
          aria-required="true"
          placeholder="נושא הפנייה"
          value={formData.subject}
          onChange={handleChange}
          error={errors.subject}
        />

        <Textarea
          label="הודעה"
          name="message"
          required
          aria-required="true"
          placeholder="פרטו את פנייתכם..."
          rows={5}
          value={formData.message}
          onChange={handleChange}
          error={errors.message}
        />

        <Button
          type="submit"
          loading={status === "loading"}
          fullWidth
          size="lg"
        >
          {status === "loading" ? "שולח..." : "שלח פנייה"}
        </Button>
      </fieldset>

      {/* Status Messages */}
      {(status === "success" || status === "error") && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          aria-live="polite"
          className={cn(
            "mt-6 flex items-start gap-3 rounded-lg border p-4",
            status === "success"
              ? "border-success/30 bg-success/5 text-success"
              : "border-error/30 bg-error/5 text-error",
          )}
        >
          {status === "success" ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <p className="text-sm font-medium leading-relaxed">{serverMessage}</p>
        </div>
      )}
    </form>
  );
}
