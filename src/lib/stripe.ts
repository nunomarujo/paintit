import 'server-only';
import Stripe from 'stripe';

// Chave secreta só nas variáveis do alojamento (STRIPE_SECRET_KEY), nunca no repositório.
const key = process.env.STRIPE_SECRET_KEY ?? '';
export const stripeConfigured = key !== '';
export const stripe = stripeConfigured ? new Stripe(key) : null;
