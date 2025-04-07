'use client';
import { useEffect } from 'react';

declare global {
  interface Window {
    snsWebSdk: any;
  }
}

interface Props {
  accessToken: string;
  applicantEmail: string;
  applicantPhone: string;
  onVerified?: () => void;
}

export default function KycWidget({ accessToken, applicantEmail, applicantPhone, onVerified }: Props) {
  useEffect(() => {
    const loadSdk = () => {
      if (typeof window === 'undefined') return;
      if (window.snsWebSdk) {
        launchSdk();
      } else {
        const script = document.createElement('script');
        script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
        script.async = true;
        script.onload = () => launchSdk();
        document.body.appendChild(script);
      }
    };

    const launchSdk = () => {
      const sdk = window.snsWebSdk
        .init(accessToken, () => refreshAccessToken())
        .withConf({
          lang: 'en',
          email: applicantEmail,
          phone: applicantPhone,
        })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('onStepCompleted', payload);
        })
        .on('idCheck.onError', (error: any) => {
          console.log('onError', error);
        })
        .onMessage((type: string, payload: any) => {
          console.log('onMessage', type, payload);

          if (
            type === 'idCheck.onApplicantStatusChanged' &&
            payload.reviewStatus === 'completed' &&
            payload.reviewResult?.reviewAnswer === 'GREEN'
          ) {
            console.log('✅ KYC passed');
            onVerified?.();
          }
        })
        .build();

      sdk.launch('#sumsub-websdk-container');
    };

    const refreshAccessToken = async () => {
      try {
        const res = await fetch('/api/kyc/token', { method: 'POST' });
        const data = await res.json();
        return data.token;
      } catch (err) {
        console.error('Error fetching new access token:', err);
        return '';
      }
    };

    loadSdk();
  }, [accessToken, applicantEmail, applicantPhone]);

  return <div id="sumsub-websdk-container"/>;
}
