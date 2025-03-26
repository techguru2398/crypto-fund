import { Suspense } from "react";
import Deposit from "./Deposit";

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Deposit />
    </Suspense>
  );
}
