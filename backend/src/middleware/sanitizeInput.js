function scrub(value) {
  if (Array.isArray(value)) return value.forEach(scrub);
  if (!value || typeof value !== 'object') return;
  Object.keys(value).forEach(key => {
    if (key.startsWith('$') || key.includes('.')) { delete value[key]; return; }
    scrub(value[key]);
  });
}

module.exports = (req, res, next) => { scrub(req.body); next(); };
