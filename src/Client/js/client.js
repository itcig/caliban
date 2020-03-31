(function() {
    var u = window.location.origin + '/';
    _cbn.push(['setTrackerUrl', u + 'collect']);
    var d = document,
        g = d.createElement('script'),
        s = d.getElementsByTagName('script')[0];
    g.type = 'text/javascript';
    g.async = true;
    g.defer = true;
    g.src = u + 'caliban.js';
    s.parentNode.insertBefore(g, s);
})();
