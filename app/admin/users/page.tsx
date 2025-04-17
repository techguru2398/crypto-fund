import { Suspense } from "react";
import AdminUsersPage from "./AdminUser";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminUsersPage />
    </Suspense>
  );
}
