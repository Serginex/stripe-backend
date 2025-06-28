const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.SECRET_KEY_STRIPE);
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Endpoint GET de teste para confirmar servidor online
app.get('/', (req, res) => {
  res.send('Servidor online');
});

// ✅ Endpoint para criar Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { email, priceId } = req.body;

  console.log("Usando priceId fixo: price_1Reyg8EYgElCatRxeizbSN2a");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: [
        {
          price: 'price_1Rf7OwEYgEICatRxBTqnJdR9',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://www.consulteseufuturo.com/sucesso',
      cancel_url: 'https://www.consulteseufuturo.com/cancelado',
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

    // Aqui você deve implementar o fetch para seu backend Wix
    // para somar os créditos ao usuário com o email recebido.
  }

  res.status(200).send();
});

// ✅ Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
