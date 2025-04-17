import { Suspense } from "react";
import AdminFundsPage from "./AdminFund";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminFundsPage />
    </Suspense>
  );
}
