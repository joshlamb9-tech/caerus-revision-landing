// Caerus Revision — Stripe Webhook Edge Function
// Deployed via: supabase functions deploy stripe-webhook
// Env vars required (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY     — sk_test_... or sk_live_...
//   STRIPE_WEBHOOK_SECRET — whsec_... (from Stripe dashboard webhook settings)
//   SUPABASE_URL          — automatically injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — automatically injected by Supabase

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore deno fetch
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-04-10',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('Received Stripe event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // client_reference_id = Supabase user UUID (set when creating the checkout URL)
    const userId = session.client_reference_id;
    const email = session.customer_details?.email ?? '';
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const paymentIntent = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : null;

    if (!userId) {
      console.error('No client_reference_id on session:', session.id);
      // Still return 200 so Stripe doesn't retry
      return new Response(JSON.stringify({ received: true, warning: 'no user id' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const { error } = await supabase
      .from('access_grants')
      .upsert(
        {
          user_id: userId,
          email: email,
          product: 'latin',
          stripe_customer_id: customerId,
          stripe_payment_intent: paymentIntent,
          valid_until: validUntil.toISOString(),
        },
        { onConflict: 'user_id,product' },
      );

    if (error) {
      console.error('Supabase upsert error:', error);
      return new Response('Database error', { status: 500 });
    }

    console.log(`Access granted: user=${userId} until=${validUntil.toISOString()}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
