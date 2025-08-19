module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, message: 'Hello from Vercel functions' });
};