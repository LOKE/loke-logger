exports.getCID = function() {

  var d = process.domain || {};
  return d.cid;

};
