import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase/client';

// Initialize Stripe (will fail gracefully if not configured)
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set up your Stripe account.' },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const { packageId, priceId, credits, priceCents } = await req.json();

    // Get authenticated user
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        credits: credits.toString(),
      },
      line_items: [
        {
          price: priceId, // Use Stripe Price ID if available
          quantity: 1,
        },
      ],
      // If no priceId, create price on the fly
      ...(priceId ? {} : {
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${credits} MoonScribe Credits`,
                description: `Credit package for MoonScribe AI`,
              },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
        ],
      }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/settings?tab=billing&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/settings?tab=billing&canceled=true`,
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
