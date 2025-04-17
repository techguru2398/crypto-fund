import { Suspense } from "react";
import AdminDashboard from "./Admin";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}
