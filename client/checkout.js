const $ = s => document.querySelector(s)

const poll_url   = $('meta[name=invoice-poll-url]').content
    , expires_at = $('meta[name=invoice-expiry]').content;

(function poll() {
  const req = new XMLHttpRequest()
  req.addEventListener('load', ev =>
    ev.target.status === 204 ? location.reload() // invoice paid
  : ev.target.status === 410 ? location.reload() // invoice expired
  : ev.target.status === 402 ? poll() // long polling timed-out, re-poll immediately
  : setTimeout(poll, 10000)) // unknown response, re-poll after delay

  req.addEventListener('error', _ => setTimeout(poll, 10000))
  req.open('GET', poll_url)
  req.send()
})()

function updateExpiry() {
  const left = expires_at - (Date.now()/1000|0)
  if (left > 0) $('.expiry span').innerHTML = formatDur(left)
  else location.reload()
}

function formatDur(x) {
  const m=x/60|0, s=x%60
  return ''+m+':'+(s<10?'0':'')+s
}

updateExpiry()
setInterval(updateExpiry, 1000)
$('.expiry').style.display='block'
