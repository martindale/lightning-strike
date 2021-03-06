import wrap from './lib/promise-wrap'

if (!process.env.API_TOKEN) throw new Error('please configure the API_TOKEN environment variable')

const auth = require('./lib/auth')('api-token', process.env.API_TOKEN)

module.exports = app => {
  const { payListen, model: { newInvoice, fetchInvoice, listInvoices } } = app

  app.param('invoice', wrap(async (req, res, next, id) => {
    req.invoice = await fetchInvoice(req.params.invoice)
    if (!req.invoice) return res.sendStatus(404)
    req.invoice_expired = !req.invoice.completed && req.invoice.expires_at < Date.now()/1000
    next()
  }))

  app.get('/invoices', auth, wrap(async (req, res) =>
    res.send(await listInvoices())))

  app.get('/invoice/:invoice', auth, (req, res) =>
    res.send(req.invoice))

  app.post('/invoice', auth, wrap(async (req, res) =>
    res.status(201).send(await newInvoice(req.body))))

  app.get('/invoice/:invoice/wait', auth, wrap(async (req, res) => {
    if (req.invoice.completed) return res.send(req.invoice)
    if (req.invoice_expired)   return res.sendStatus(410)

    const timeout = Math.min(+req.query.timeout || 300, 1800)*1000
        , paid    = await payListen.register(req.params.invoice, timeout)

    if (paid) res.send(paid)
    else res.sendStatus(402)
    // @TODO remove listener on client disconnect
  }))

  app.get('/payment-stream', auth, (req, res, next) => {
    res.set({
      'Content-Type':  'text/event-stream'
    , 'Cache-Control': 'no-cache'
    , 'Connection':    'keep-alive'
    }).flushHeaders()

    const onPay = invoice => res.write(`data:${ JSON.stringify(invoice) }\n\n`)
    payListen.on('payment', onPay)
    req.on('close', _ => payListen.removeListener('payment', onPay))
  })
}
