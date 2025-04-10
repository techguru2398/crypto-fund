import { Suspense } from "react";
import Investment from "./Investment";


export default function InvestmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Investment />
    </Suspense>
  );
}
