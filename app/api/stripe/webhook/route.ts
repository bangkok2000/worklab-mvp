import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/client';

// Initialize Stripe
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(key);
};

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const stripe = getStripe();
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      
      case 'payment_intent.succeeded': {
        // Additional handling if needed
        console.log('Payment succeeded:', event.data.object.id);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout - add credits to user account
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  const credits = parseInt(session.metadata?.credits || '0', 10);
  const packageId = session.metadata?.package_id;

  if (!userId || !credits) {
    console.error('Missing user_id or credits in session metadata');
    return;
  }

  console.log(`Adding ${credits} credits to user ${userId}`);

  try {
    const supabase = createAdminClient();

    // Call the add_credits function
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: credits,
      p_type: 'purchase',
      p_description: `Purchased ${credits} credits`,
      p_reference_id: session.id,
      p_metadata: {
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        package_id: packageId,
        amount_paid: session.amount_total,
        currency: session.currency,
      },
    });

    if (error) {
      console.error('Error adding credits:', error);
      throw error;
    }

    console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${data}`);

  } catch (error) {
    console.error('Failed to add credits after payment:', error);
    // In production, you'd want to alert on this and have a manual recovery process
    throw error;
  }
}

// Note: Next.js App Router automatically provides raw body for route handlers
// No special config needed - just use req.text() as we do above
