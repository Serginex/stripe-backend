import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import Stripe from 'stripe';
import bodyParser from 'body-parser';

const app = express();
const stripe = new Stripe(process.env.SECRET_KEY_STRIPE);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Middleware para JSON em todas as rotas, exceto webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.use(cors({
  origin: 'https://www.consulteseufuturo.com.br',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ✅ Endpoint GET de teste
app.get('/', (req, res) => {
  res.send('Servidor online');
});

// ✅ Endpoint para criar Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { email } = req.body;
  console.log("Usando priceId fixo: price_1Rf7OwEYgEICatRxBTqnJdR9");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1Rf7OwEYgEICatRxBTqnJdR9',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://www.consulteseufuturo.com.br/sucesso',
      cancel_url: 'https://www.consulteseufuturo.com.br/cancelado',
      metadata: { email },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao criar sessão');
  }
});

// ✅ Endpoint Webhook Stripe
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata.email;
    const amountTotal = session.amount_total;

    console.log(`Pagamento confirmado para ${email}, valor: ${amountTotal}`);

    // ✅ Fetch para Wix para somar créditos
    fetch("https://www.consulteseufuturo.com.br/_functions/somarCreditoStripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        valor: amountTotal,
        paymentId: session.id
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Retorno do Wix:", data);
      })
      .catch(err => {
        console.error("❌ Erro ao enviar para Wix:", err);
      });
  }

  res.status(200).send();
});

// ✅ Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
