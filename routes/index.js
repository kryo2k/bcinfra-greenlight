
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('page', {
      jsModule: 'app/index',
      title: 'Index Page',
      text: 'This page will contain download link for .apk / .img'
  });
};