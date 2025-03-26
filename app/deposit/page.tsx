import React, { useState, useEffect } from "react";
import { loadStripeOnramp } from "@stripe/crypto";

import { CryptoElements, OnrampElement } from '@/components/StripeCryptoElements';

// Make sure to call loadStripeOnramp outside of a component’s render to avoid
// recreating the StripeOnramp object on every render.
// This is your test publishable API key.
const stripeOnrampPromise = loadStripeOnramp("pk_test_51OlfUEH2M8Zi7WwPb0afyP5uLG49OCDUOgeEzJLi0iDovjh4a4aW3neAtqlGwacDCqlwIV2IwlVE4rgvHR4cqnyV00ihUStLBF");

export default function Deposit() {
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetches an onramp session and captures the client secret
    fetch(
      "https://fund-tracker-six.vercel.app/api/create-onramp-session",
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_details: {
          destination_currency: "usdc",
          destination_exchange_amount: "13.37",
          destination_network: "ethereum",
        }
      }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  const onChange = React.useCallback(({ session }) => {
    setMessage(`OnrampSession is now in ${session.status} state.`);
  }, []);

  return (
    <div className="App">
      <CryptoElements stripeOnramp={stripeOnrampPromise}>
        {clientSecret && (
          <OnrampElement
            id="onramp-element"
            clientSecret={clientSecret}
            appearance={{ theme: "dark" }}
            onReady={() => console.log("OnrampElement is ready.")}
            onChange={onChange}
          />
        )}
      </CryptoElements>
      {message && <div id="onramp-message">{message}</div>}
    
    </div>
  );
}