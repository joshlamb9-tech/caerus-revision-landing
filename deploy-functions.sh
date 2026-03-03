#!/usr/bin/env bash
# Caerus Revision — Deploy Supabase Edge Functions
# Run from: /Users/josh/projects/caerus-revision-landing/
# Prerequisites: supabase CLI logged in + linked to project

set -e
cd "$(dirname "$0")"

PROJECT_REF="dlcseuejvducbsjhqvze"

echo "🔗 Linking to Caerus Supabase project..."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "🔑 Setting secrets (you'll be prompted for values)..."
echo "   Required secrets:"
echo "   STRIPE_SECRET_KEY     — from https://dashboard.stripe.com/apikeys (sk_test_... or sk_live_...)"
echo "   STRIPE_WEBHOOK_SECRET — from https://dashboard.stripe.com/webhooks (whsec_...)"
echo ""

# Set secrets interactively
supabase secrets set STRIPE_SECRET_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET

echo ""
echo "🚀 Deploying Edge Functions..."

supabase functions deploy create-checkout --project-ref "$PROJECT_REF"
supabase functions deploy stripe-webhook  --project-ref "$PROJECT_REF"

echo ""
echo "✅ Done!"
echo ""
echo "Webhook URL to add in Stripe Dashboard:"
echo "  https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "In Stripe Dashboard → Developers → Webhooks → Add endpoint:"
echo "  URL: above"
echo "  Events: checkout.session.completed"
echo ""
echo "Then copy the signing secret (whsec_...) and run:"
echo "  supabase secrets set STRIPE_WEBHOOK_SECRET"
