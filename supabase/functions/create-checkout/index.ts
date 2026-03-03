// Caerus Revision — Create Stripe Embedded Checkout Session
// Deployed via: supabase functions deploy create-checkout
// Env vars required:
//   STRIPE_SECRET_KEY         — sk_test_... or sk_live_...
//   SUPABASE_URL              — auto-injected
//   SUPABASE_ANON_KEY         — auto-injected

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = 'https://latin.caerusrevision.co.uk';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Verify user JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  // Check if user already has a valid grant (don't charge twice)
  const { data: grants } = await supabase
    .from('access_grants')
    .select('id, valid_until')
    .eq('user_id', user.id)
    .eq('product', 'latin')
    .gt('valid_until', new Date().toISOString())
    .limit(1);

  if (grants && grants.length > 0) {
    return new Response(
      JSON.stringify({ alreadyGranted: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Create Stripe embedded checkout session
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    // @ts-ignore deno fetch
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2024-04-10',
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Caerus Latin — Annual Access',
              description:
                'Full access to vocabulary, grammar, exercises, and practice papers for CE Latin.',
            },
            unit_amount: 2999, // £29.99
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      customer_email: user.email,
      return_url:
        `https://latin.caerusrevision.co.uk/welcome.html?session_id={CHECKOUT_SESSION_ID}`,
    });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ clientSecret: session.client_secret }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
