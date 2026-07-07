"use client";

export function AutoSubmitForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      {children}
    </form>
  );
}
