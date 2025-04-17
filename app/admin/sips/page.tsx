import { Suspense } from "react";
import AdminSipsPage from "./AdminSip";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminSipsPage />
    </Suspense>
  );
}
