/**
 * Stripe Client Utilities
 * For initiating checkout from the frontend
 */

/**
 * Check if Stripe is configured
 */
export const isStripeConfigured = (): boolean => {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
};

/**
 * Create checkout session and redirect to Stripe
 */
export async function createCheckoutSession(options: {
  packageId: string;
  priceId?: string;
  credits: number;
  priceCents: number;
  accessToken: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create checkout session via our API
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.accessToken}`,
      },
      body: JSON.stringify({
        packageId: options.packageId,
        priceId: options.priceId,
        credits: options.credits,
        priceCents: options.priceCents,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create checkout' };
    }

    // Redirect to Stripe Checkout URL
    if (data.url) {
      window.location.href = data.url;
      return { success: true };
    }

    return { success: false, error: 'Failed to get checkout URL' };

  } catch (error: any) {
    console.error('Checkout error:', error);
    return { success: false, error: error.message || 'Checkout failed' };
  }
}

/**
 * Credit package type for display
 */
export interface CreditPackageDisplay {
  id: string;
  name: string;
  credits: number;
  price: number; // In dollars
  priceFormatted: string;
  perCreditCost: string;
  badge?: string;
  stripePriceId?: string;
}

/**
 * Get displayable credit packages
 */
export function formatCreditPackages(packages: any[]): CreditPackageDisplay[] {
  return packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price: pkg.price_cents / 100,
    priceFormatted: `$${(pkg.price_cents / 100).toFixed(2)}`,
    perCreditCost: `$${(pkg.price_cents / 100 / pkg.credits).toFixed(4)}/credit`,
    badge: pkg.badge,
    stripePriceId: pkg.stripe_price_id,
  }));
}
