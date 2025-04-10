'use client';
import { Suspense } from "react";
import Account from "./Account";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Elements stripe={stripePromise}>
        <Account />
      </Elements>
    </Suspense>
  );
}
