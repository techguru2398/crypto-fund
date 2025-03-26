import { Suspense } from "react";
import Account from "./Account";

export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Account />
    </Suspense>
  );
}
