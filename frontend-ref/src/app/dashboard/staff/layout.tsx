import DashboardLayout from "@/components/DashboardLayout";

export default function StaffDashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
