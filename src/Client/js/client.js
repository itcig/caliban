
(function () {
	var u = window.location.origin + "/";
	_cbn.push(['setTrackerUrl', u + 'collect']);
	var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
	g.type = 'text/javascript';
	g.async = true;
	g.defer = true;
	g.src = u + 'caliban.js';
	s.parentNode.insertBefore(g, s);
})();

// (function() {
//
// 	// store the name of the Caliban object
// 	window.Caliban = 'cbn';
//
// 	// check whether the Caliban object is defined
// 	if (!('cbn' in window)){
//
// 		// define the Caliban object
// 		window.cbn = function(){
//
// 			// add the tasks to the queue
// 			window.cbn.push(arguments);
//
// 		};
//
// 		// create the queue
// 		window.cbn = [];
//
// 	}
//
// 	// store the current timestamp
// 	window.cbn.l = (new Date()).getTime();
//
// 	// create a new script element
// 	var script = document.createElement('script');
// 	script.src = '/client.js';
// 	script.async = true;
//
// 	// insert the script element into the document
// 	var firstScript = document.getElementsByTagName('script')[0];
// 	firstScript.parentNode.insertBefore(script, firstScript);
// })();


/**
 * Creates a temporary global ga object and loads analytics.js.
 * Parameters o, a, and m are all used internally. They could have been
 * declared using 'var', instead they are declared as parameters to save
 * 4 bytes ('var ').
 *
 * @param {Window}        i The global context object.
 * @param {HTMLDocument}  s The DOM document object.
 * @param {string}        o Must be 'script'.
 * @param {string}        g Protocol relative URL of the analytics.js script.
 * @param {string}        r Global name of analytics object. Defaults to 'ga'.
 * @param {HTMLElement}   a Async script tag.
 * @param {HTMLElement}   m First script tag in document.
 */
// (function(i, s, o, g, r, a, m){
// 	i['Caliban'] = r; // Acts as a pointer to support renaming.
//
// 	// Creates an initial ga() function.
// 	// The queued commands will be executed once analytics.js loads.
// 	i[r] = i[r] || function() {
// 		(i[r].q = i[r].q || []).push(arguments)
// 	},
//
// 		// Sets the time (as an integer) this tag was executed.
// 		// Used for timing hits.
// 		i[r].l = 1 * new Date();
//
// 	// Insert the script tag asynchronously.
// 	// Inserts above current tag to prevent blocking in addition to using the
// 	// async attribute.
// 	a = s.createElement(o),
// 		m = s.getElementsByTagName(o)[0];
// 	a.async = 1;
// 	a.src = g;
// 	m.parentNode.insertBefore(a, m)
// })(window, document, 'script', 'https://caliban.local/caliban.js', 'caliban');
//
// caliban('trackPageView');
// caliban('enableLinkTracking');
// caliban('setTrackerUrl', 'test.php');



// window.cbn.push(['trackPageView']);
// window.cbn.push(['enableLinkTracking']);
// window.cbn.push(['setTrackerUrl']);

// var u = "//caliban.local/";
// window.cbn.push(['setTrackerUrl', u + 'matomo.php']);

// var img1 = new Image();
// img1.src = 'http://path/to/file.gif?otherinfohere';