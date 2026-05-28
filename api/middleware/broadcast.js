/**
 * Broadcast middleware — adds req.broadcast() to send real-time updates
 */
module.exports = function(req, res, next) {
  req.broadcast = function(type, data) {
    const fn = req.app.get('broadcast');
    if (fn) fn(type, data);
  };
  next();
};
