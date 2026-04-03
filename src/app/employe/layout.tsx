export default function EmployeeLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-primary/5 p-4">
      {children}
    </div>
  );
}
