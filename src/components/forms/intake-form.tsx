"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  // WCAG 3.3.6 wants a submission to be reversible, checked, or confirmed.
  // Reversible it is not — the enquiry is mailed on — so the form shows
  // what is about to be sent and waits for an explicit confirmation.
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  // The review panel only exists after the state commit, so focus moves
  // here rather than inside the submit handler.
  useEffect(() => {
    if (reviewing) reviewRef.current?.focus();
  }, [reviewing]);

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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validate(formData);
    const failed = Object.keys(validationErrors);
    if (failed.length > 0) {
      setErrors(validationErrors);
      // Without this the submit button keeps focus and nothing announces
      // the failure — the form just appears to do nothing (WCAG 3.3.1).
      // Fields render in declaration order, so the first key is the
      // topmost failure.
      const order: (keyof FormErrors)[] = [
        "name",
        "email",
        "phone",
        "subject",
        "message",
      ];
      const firstInvalid = order.find((k) => failed.includes(k));
      // Focus straight away rather than in a rAF: the fields are already
      // mounted, and rAF never fires while the tab is hidden.
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    setErrors({});
    // Validation passed — show the review panel instead of sending.
    setReviewing(true);
  }

  async function sendForm() {
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
      setReviewing(false);
      setServerMessage("הפנייה שלך התקבלה בהצלחה! אצור עמך קשר בהקדם.");
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
          placeholder="שם מלא"
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

        {!reviewing && (
          <Button type="submit" fullWidth size="lg">
            להמשך ולבדיקת הפרטים
          </Button>
        )}
      </fieldset>

      {/* Review step — WCAG 3.3.6. Everything about to be sent, in one
          place, with a way back to editing before it leaves. */}
      {reviewing && (
        <section
          ref={reviewRef}
          tabIndex={-1}
          aria-labelledby="intake-review-heading"
          className="mt-6 rounded-lg border border-border-control bg-muted-bg p-4"
        >
          <h3
            id="intake-review-heading"
            className="mb-3 text-base font-bold text-primary-dark"
          >
            בדקו את הפרטים לפני השליחה
          </h3>
          <dl className="space-y-2 text-sm">
            {(
              [
                ["שם מלא", formData.name],
                ["אימייל", formData.email],
                ["טלפון", formData.phone || "לא צוין"],
                ["נושא", formData.subject],
                ["הודעה", formData.message],
              ] as const
            ).map(([term, value]) => (
              <div key={term} className="flex flex-col gap-0.5">
                <dt className="font-semibold text-foreground">{term}</dt>
                <dd className="whitespace-pre-wrap break-words text-muted">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={sendForm}
              loading={status === "loading"}
              size="lg"
              className="flex-1"
            >
              {status === "loading" ? "בשליחה..." : "אישור ושליחה"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={status === "loading"}
              onClick={() => {
                setReviewing(false);
                formRef.current
                  ?.querySelector<HTMLElement>('[name="name"]')
                  ?.focus();
              }}
              className="flex-1"
            >
              חזרה לעריכה
            </Button>
          </div>
        </section>
      )}

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
