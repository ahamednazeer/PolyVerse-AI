import DashboardLayout from "@/components/DashboardLayout";

export default function StudentDashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
