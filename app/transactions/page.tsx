import { Suspense } from "react";
import Transactions from "./Transactions";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Transactions />
    </Suspense>
  );
}
