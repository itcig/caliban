/*!
 * Caliban - anonymous, cross-domain, session tracker
 *
 * JavaScript tracking client
 *
 * @link https://github.com/itcig/caliban
 * @source https://github.com/itcig/caliban/blob/master/src/server/js/caliban.js
 * @license https://github.com/itcig/caliban/blob/master/LICENSE MIT
 */

/*
 * Browser [In]Compatibility
 * - minimum required ECMAScript: ECMA-262, edition 3
 *
 * Incompatible with these (and earlier) versions of:
 * - IE4 - try..catch and for..in introduced in IE5
 * - IE5 - named anonymous functions, array.push, encodeURIComponent, decodeURIComponent, and getElementsByTagName introduced in IE5.5
 * - IE6 and 7 - window.JSON introduced in IE8
 * - Firefox 1.0 and Netscape 8.x - FF1.5 adds array.indexOf, among other things
 * - Mozilla 1.7 and Netscape 6.x-7.x
 * - Netscape 4.8
 * - Opera 6 - Error object (and Presto) introduced in Opera 7
 * - Opera 7
 */

// asynchronous tracker (or proxy)
if (typeof _cbn !== 'object') {
    _cbn = [];
}

// Caliban singleton and namespace
if (typeof window.Caliban !== 'object') {
    window.Caliban = (function() {
        'use strict';

        /************************************************************
         * Private data
         ************************************************************/

        var eventHandlers = {},
            /* alias frequently used globals for added minification */
            documentAlias = document,
            navigatorAlias = navigator,
            screenAlias = screen,
            windowAlias = window,
            /* encode */
            encodeWrapper = windowAlias.encodeURIComponent,
            /* decode */
            decodeWrapper = windowAlias.decodeURIComponent,
            /* urldecode */
            urldecode = unescape,
            /* asyncTracker instance */
            asyncTracker = null,
            /* iterator */
            iterator,
            /* local Caliban */
            Caliban;

        /************************************************************
         * Private methods
         ************************************************************/

        /**
         * To prevent Javascript Error: Uncaught URIError: URI malformed when encoding is not UTF-8. Use this method
         * instead of decodeWrapper if a text could contain any non UTF-8 encoded characters eg
         * a URL like http://apache.caliban/test.html?%F6%E4%FC or a link like
         * <a href="test-with-%F6%E4%FC/story/0">(encoded iso-8859-1 URL)</a>
         */
        function safeDecodeWrapper(url) {
            try {
                return decodeWrapper(url);
            } catch (e) {
                return unescape(url);
            }
        }

        /*
         * Is property defined?
         */
        function isDefined(property) {
            // workaround https://github.com/douglascrockford/JSLint/commit/24f63ada2f9d7ad65afc90e6d949f631935c2480
            var propertyType = typeof property;

            return propertyType !== 'undefined';
        }

        /*
         * Is property a function?
         */
        function isFunction(property) {
            return typeof property === 'function';
        }

        /*
         * Is property an object?
         *
         * @return bool Returns true if property is null, an Object, or subclass of Object (i.e., an instanceof String, Date, etc.)
         */
        function isObject(property) {
            return typeof property === 'object';
        }

        /*
         * Is property a string?
         */
        function isString(property) {
            return typeof property === 'string' || property instanceof String;
        }

        /*
         * Is property a string?
         */
        function isNumber(property) {
            return typeof property === 'number' || property instanceof Number;
        }

        /*
         * Is property a string?
         */
        function isNumberOrHasLength(property) {
            return isDefined(property) && (isNumber(property) || (isString(property) && property.length));
        }

        function isObjectEmpty(property) {
            if (!property) {
                return true;
            }

            var i;
            var isEmpty = true;
            for (i in property) {
                if (Object.prototype.hasOwnProperty.call(property, i)) {
                    isEmpty = false;
                }
            }

            return isEmpty;
        }

        /*
         * apply wrapper
         *
         * @param array parameterArray An array comprising either:
         *      [ 'methodName', optional_parameters ]
         * or:
         *      [ functionObject, optional_parameters ]
         */
        function apply() {
            var i, f, parameterArray, trackerCall;

            for (i = 0; i < arguments.length; i += 1) {
                trackerCall = null;
                if (arguments[i] && arguments[i].slice) {
                    trackerCall = arguments[i].slice();
                }
                parameterArray = arguments[i];
                f = parameterArray.shift();

                var fParts, context;

                var functionName = isString(f) ? f : f.name;

                asyncTracker.getDebug() && console.log('[CALIBAN_DEBUG] API: ' + f + '()', parameterArray.length ? parameterArray : '');

                if (isString(f)) {
                    context = asyncTracker;

                    if (context[f]) {
                        context[f].apply(context, parameterArray);
                    } else {
                        var message =
                            "The method '" +
                            f +
                            '\' was not found in "_cbn" variable.  Please have a look at the Caliban tracker documentation.';
                        console.warn(message);

                        throw new TypeError(message);
                    }
                } else {
                    f.apply(asyncTracker, parameterArray);
                }
            }
        }

        /*
         * Cross-browser helper function to add event handler
         */
        function addEventListener(element, eventType, eventHandler, useCapture) {
            if (element.addEventListener) {
                element.addEventListener(eventType, eventHandler, useCapture);

                return true;
            }

            if (element.attachEvent) {
                return element.attachEvent('on' + eventType, eventHandler);
            }

            element['on' + eventType] = eventHandler;
        }

        function trackCallbackOnLoad(callback) {
            if (documentAlias.readyState === 'complete') {
                callback();
            } else if (windowAlias.addEventListener) {
                windowAlias.addEventListener('load', callback, false);
            } else if (windowAlias.attachEvent) {
                windowAlias.attachEvent('onload', callback);
            }
        }

        function trackCallbackOnReady(callback) {
            var loaded = false;

            if (documentAlias.attachEvent) {
                loaded = documentAlias.readyState === 'complete';
            } else {
                loaded = documentAlias.readyState !== 'loading';
            }

            if (loaded) {
                callback();
                return;
            }

            var _timer;

            if (documentAlias.addEventListener) {
                addEventListener(documentAlias, 'DOMContentLoaded', function ready() {
                    documentAlias.removeEventListener('DOMContentLoaded', ready, false);
                    if (!loaded) {
                        loaded = true;
                        callback();
                    }
                });
            } else if (documentAlias.attachEvent) {
                documentAlias.attachEvent('onreadystatechange', function ready() {
                    if (documentAlias.readyState === 'complete') {
                        documentAlias.detachEvent('onreadystatechange', ready);
                        if (!loaded) {
                            loaded = true;
                            callback();
                        }
                    }
                });

                if (documentAlias.documentElement.doScroll && windowAlias === windowAlias.top) {
                    (function ready() {
                        if (!loaded) {
                            try {
                                documentAlias.documentElement.doScroll('left');
                            } catch (error) {
                                setTimeout(ready, 0);

                                return;
                            }
                            loaded = true;
                            callback();
                        }
                    })();
                }
            }

            // fallback
            addEventListener(
                windowAlias,
                'load',
                function() {
                    if (!loaded) {
                        loaded = true;
                        callback();
                    }
                },
                false
            );
        }

        /*
         * Get page referrer
         */
        function getReferrer() {
            var referrer = '';

            try {
                referrer = windowAlias.top.document.referrer;
            } catch (e) {
                if (windowAlias.parent) {
                    try {
                        referrer = windowAlias.parent.document.referrer;
                    } catch (e2) {
                        referrer = '';
                    }
                }
            }

            if (referrer === '') {
                referrer = documentAlias.referrer;
            }

            return referrer;
        }

        /*
         * Extract scheme/protocol from URL
         */
        function getProtocolScheme(url) {
            var e = new RegExp('^([a-z]+):'),
                matches = e.exec(url);

            return matches ? matches[1] : null;
        }

        /*
         * Extract hostname from URL
         */
        function getHostName(url) {
            // scheme : // [username [: password] @] hostame [: port] [/ [path] [? query] [# fragment]]
            var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'),
                matches = e.exec(url);

            return matches ? matches[1] : url;
        }

        /**
         * We do not check whether URL contains already url parameter, please use removeUrlParameter() if needed
         * before calling this method.
         * This method makes sure to append URL parameters before a possible hash. Will escape (encode URI component)
         * the set name and value
         */
        function addUrlParameter(url, name, value) {
            url = String(url);

            if (!value) {
                value = '';
            }

            var hashPos = url.indexOf('#');
            var urlLength = url.length;

            if (hashPos === -1) {
                hashPos = urlLength;
            }

            var baseUrl = url.substr(0, hashPos);
            var urlHash = url.substr(hashPos, urlLength - hashPos);
            if (baseUrl.indexOf('?') === -1) {
                baseUrl += '?';
            } else if (baseUrl.charAt(baseUrl.length - 1) !== '?') {
                baseUrl += '&';
            }
            // nothing to if ends with ?

            return baseUrl + encodeWrapper(name) + '=' + encodeWrapper(value) + urlHash;
        }

        function removeUrlParameter(url, name) {
            url = String(url);

            if (url.indexOf('?' + name + '=') === -1 && url.indexOf('&' + name + '=') === -1) {
                // nothing to remove, url does not contain this parameter
                return url;
            }

            var searchPos = url.indexOf('?');
            if (searchPos === -1) {
                // nothing to remove, no query parameters
                return url;
            }

            var queryString = url.substr(searchPos + 1);
            var baseUrl = url.substr(0, searchPos);

            if (queryString) {
                var urlHash = '';
                var hashPos = queryString.indexOf('#');
                if (hashPos !== -1) {
                    urlHash = queryString.substr(hashPos + 1);
                    queryString = queryString.substr(0, hashPos);
                }

                var param;
                var paramsArr = queryString.split('&');
                var i = paramsArr.length - 1;

                for (i; i >= 0; i--) {
                    param = paramsArr[i].split('=')[0];
                    if (param === name) {
                        paramsArr.splice(i, 1);
                    }
                }

                var newQueryString = paramsArr.join('&');

                if (newQueryString) {
                    baseUrl = baseUrl + '?' + newQueryString;
                }

                if (urlHash) {
                    baseUrl += '#' + urlHash;
                }
            }

            return baseUrl;
        }

        /*
         * Extract parameter from URL
         */
        function getUrlParameter(url, name) {
            var regexSearch = '[\\?&#]' + name + '=([^&#]*)';
            var regex = new RegExp(regexSearch);
            var results = regex.exec(url);
            return results ? decodeWrapper(results[1]) : '';
        }

        /*
         * UTF-8 encoding
         */
        function utf8_encode(argString) {
            return unescape(encodeWrapper(argString));
        }

        /************************************************************
         * sha1
         * - based on sha1 from http://phpjs.org/functions/sha1:512 (MIT / GPL v2)
         ************************************************************/

        function sha1(str) {
            // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
            // + namespaced by: Michael White (http://getsprink.com)
            // +      input by: Brett Zamir (http://brett-zamir.me)
            // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)

            var rotate_left = function(n, s) {
                    return (n << s) | (n >>> (32 - s));
                },
                cvt_hex = function(val) {
                    var strout = '',
                        i,
                        v;

                    for (i = 7; i >= 0; i--) {
                        v = (val >>> (i * 4)) & 0x0f;
                        strout += v.toString(16);
                    }

                    return strout;
                },
                blockstart,
                i,
                j,
                W = [],
                H0 = 0x67452301,
                H1 = 0xefcdab89,
                H2 = 0x98badcfe,
                H3 = 0x10325476,
                H4 = 0xc3d2e1f0,
                A,
                B,
                C,
                D,
                E,
                temp,
                str_len,
                word_array = [];

            str = utf8_encode(str);
            str_len = str.length;

            for (i = 0; i < str_len - 3; i += 4) {
                j = (str.charCodeAt(i) << 24) | (str.charCodeAt(i + 1) << 16) | (str.charCodeAt(i + 2) << 8) | str.charCodeAt(i + 3);
                word_array.push(j);
            }

            switch (str_len & 3) {
                case 0:
                    i = 0x080000000;
                    break;
                case 1:
                    i = (str.charCodeAt(str_len - 1) << 24) | 0x0800000;
                    break;
                case 2:
                    i = (str.charCodeAt(str_len - 2) << 24) | (str.charCodeAt(str_len - 1) << 16) | 0x08000;
                    break;
                case 3:
                    i =
                        (str.charCodeAt(str_len - 3) << 24) |
                        (str.charCodeAt(str_len - 2) << 16) |
                        (str.charCodeAt(str_len - 1) << 8) |
                        0x80;
                    break;
            }

            word_array.push(i);

            while ((word_array.length & 15) !== 14) {
                word_array.push(0);
            }

            word_array.push(str_len >>> 29);
            word_array.push((str_len << 3) & 0x0ffffffff);

            for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
                for (i = 0; i < 16; i++) {
                    W[i] = word_array[blockstart + i];
                }

                for (i = 16; i <= 79; i++) {
                    W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
                }

                A = H0;
                B = H1;
                C = H2;
                D = H3;
                E = H4;

                for (i = 0; i <= 19; i++) {
                    temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5a827999) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 20; i <= 39; i++) {
                    temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ed9eba1) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 40; i <= 59; i++) {
                    temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8f1bbcdc) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                for (i = 60; i <= 79; i++) {
                    temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xca62c1d6) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B, 30);
                    B = A;
                    A = temp;
                }

                H0 = (H0 + A) & 0x0ffffffff;
                H1 = (H1 + B) & 0x0ffffffff;
                H2 = (H2 + C) & 0x0ffffffff;
                H3 = (H3 + D) & 0x0ffffffff;
                H4 = (H4 + E) & 0x0ffffffff;
            }

            temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

            return temp.toLowerCase();
        }

        /************************************************************
         * end sha1
         ************************************************************/

        /*
         * Fix-up URL when page rendered from search engine cache or translated page
         */
        function urlFixup(hostName, href, referrer) {
            if (!hostName) {
                hostName = '';
            }

            if (!href) {
                href = '';
            }

            if (hostName === 'translate.googleusercontent.com') {
                // Google
                if (referrer === '') {
                    referrer = href;
                }

                href = getUrlParameter(href, 'u');
                hostName = getHostName(href);
            } else if (
                hostName === 'cc.bingj.com' || // Bing
                hostName === 'webcache.googleusercontent.com' || // Google
                hostName.slice(0, 5) === '74.6.'
            ) {
                // Yahoo (via Inktomi 74.6.0.0/16)
                href = documentAlias.links[0].href;
                hostName = getHostName(href);
            }

            return [hostName, href, referrer];
        }

        /*
         * Fix-up domain
         */
        function domainFixup(domain) {
            var dl = domain.length;

            // remove trailing '.'
            if (domain.charAt(--dl) === '.') {
                domain = domain.slice(0, dl);
            }

            // remove leading '*'
            if (domain.slice(0, 2) === '*.') {
                domain = domain.slice(1);
            }

            if (domain.indexOf('/') !== -1) {
                domain = domain.substr(0, domain.indexOf('/'));
            }

            return domain;
        }

        function getChildrenFromNode(node) {
            if (!node) {
                return [];
            }

            if (!isDefined(node.children) && isDefined(node.childNodes)) {
                return node.children;
            }

            if (isDefined(node.children)) {
                return node.children;
            }

            return [];
        }

        function containsNodeElement(node, containedNode) {
            if (!node || !containedNode) {
                return false;
            }

            if (node.contains) {
                return node.contains(containedNode);
            }

            if (node === containedNode) {
                return true;
            }

            if (node.compareDocumentPosition) {
                return !!(node.compareDocumentPosition(containedNode) & 16);
            }

            return false;
        }

        // Polyfill for IndexOf for IE6-IE8
        function indexOfArray(theArray, searchElement) {
            if (theArray && theArray.indexOf) {
                return theArray.indexOf(searchElement);
            }

            // 1. Let O be the result of calling ToObject passing
            //    the this value as the argument.
            if (!isDefined(theArray) || theArray === null) {
                return -1;
            }

            if (!theArray.length) {
                return -1;
            }

            var len = theArray.length;

            if (len === 0) {
                return -1;
            }

            var k = 0;

            // 9. Repeat, while k < len
            while (k < len) {
                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the
                //    HasProperty internal method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                //    i.  Let elementK be the result of calling the Get
                //        internal method of O with the argument ToString(k).
                //   ii.  Let same be the result of applying the
                //        Strict Equality Comparison Algorithm to
                //        searchElement and elementK.
                //  iii.  If same is true, return k.
                if (theArray[k] === searchElement) {
                    return k;
                }
                k++;
            }
            return -1;
        }

        /************************************************************
         * Element Visiblility
         ************************************************************/

        /**
         * Author: Jason Farrell
         * Author URI: http://useallfive.com/
         *
         * Description: Checks if a DOM element is truly visible.
         * Package URL: https://github.com/UseAllFive/true-visibility
         * License: MIT (https://github.com/UseAllFive/true-visibility/blob/master/LICENSE.txt)
         */
        function isVisible(node) {
            if (!node) {
                return false;
            }

            //-- Cross browser method to get style properties:
            function _getStyle(el, property) {
                if (windowAlias.getComputedStyle) {
                    return documentAlias.defaultView.getComputedStyle(el, null)[property];
                }
                if (el.currentStyle) {
                    return el.currentStyle[property];
                }
            }

            function _elementInDocument(element) {
                element = element.parentNode;

                while (element) {
                    if (element === documentAlias) {
                        return true;
                    }
                    element = element.parentNode;
                }
                return false;
            }

            /**
             * Checks if a DOM element is visible. Takes into
             * consideration its parents and overflow.
             *
             * @param (el)      the DOM element to check if is visible
             *
             * These params are optional that are sent in recursively,
             * you typically won't use these:
             *
             * @param (t)       Top corner position number
             * @param (r)       Right corner position number
             * @param (b)       Bottom corner position number
             * @param (l)       Left corner position number
             * @param (w)       Element width number
             * @param (h)       Element height number
             */
            function _isVisible(el, t, r, b, l, w, h) {
                var p = el.parentNode,
                    VISIBLE_PADDING = 1; // has to be visible at least one px of the element

                if (!_elementInDocument(el)) {
                    return false;
                }

                //-- Return true for document node
                if (9 === p.nodeType) {
                    return true;
                }

                //-- Return false if our element is invisible
                if ('0' === _getStyle(el, 'opacity') || 'none' === _getStyle(el, 'display') || 'hidden' === _getStyle(el, 'visibility')) {
                    return false;
                }

                if (!isDefined(t) || !isDefined(r) || !isDefined(b) || !isDefined(l) || !isDefined(w) || !isDefined(h)) {
                    t = el.offsetTop;
                    l = el.offsetLeft;
                    b = t + el.offsetHeight;
                    r = l + el.offsetWidth;
                    w = el.offsetWidth;
                    h = el.offsetHeight;
                }

                if (node === el && (0 === h || 0 === w) && 'hidden' === _getStyle(el, 'overflow')) {
                    return false;
                }

                //-- If we have a parent, let's continue:
                if (p) {
                    //-- Check if the parent can hide its children.
                    if ('hidden' === _getStyle(p, 'overflow') || 'scroll' === _getStyle(p, 'overflow')) {
                        //-- Only check if the offset is different for the parent
                        if (
                            //-- If the target element is to the right of the parent elm
                            l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
                            //-- If the target element is to the left of the parent elm
                            l + w - VISIBLE_PADDING < p.scrollLeft ||
                            //-- If the target element is under the parent elm
                            t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
                            //-- If the target element is above the parent elm
                            t + h - VISIBLE_PADDING < p.scrollTop
                        ) {
                            //-- Our target element is out of bounds:
                            return false;
                        }
                    }
                    //-- Add the offset parent's left/top coords to our element's offset:
                    if (el.offsetParent === p) {
                        l += p.offsetLeft;
                        t += p.offsetTop;
                    }
                    //-- Let's recursively check upwards:
                    return _isVisible(p, t, r, b, l, w, h);
                }
                return true;
            }

            return _isVisible(node);
        }

        /************************************************************
         * Query
         ************************************************************/

        var query = {
            htmlCollectionToArray: function(foundNodes) {
                var nodes = [],
                    index;

                if (!foundNodes || !foundNodes.length) {
                    return nodes;
                }

                for (index = 0; index < foundNodes.length; index++) {
                    nodes.push(foundNodes[index]);
                }

                return nodes;
            },
            find: function(selector) {
                // we use querySelectorAll only on document, not on nodes because of its unexpected behavior. See for
                // instance http://stackoverflow.com/questions/11503534/jquery-vs-document-queryselectorall and
                // http://jsfiddle.net/QdMc5/ and http://ejohn.org/blog/thoughts-on-queryselectorall
                if (!document.querySelectorAll || !selector) {
                    return []; // we do not support all browsers
                }

                var foundNodes = document.querySelectorAll(selector);

                return this.htmlCollectionToArray(foundNodes);
            },
            findMultiple: function(selectors) {
                if (!selectors || !selectors.length) {
                    return [];
                }

                var index, foundNodes;
                var nodes = [];
                for (index = 0; index < selectors.length; index++) {
                    foundNodes = this.find(selectors[index]);
                    nodes = nodes.concat(foundNodes);
                }

                nodes = this.makeNodesUnique(nodes);

                return nodes;
            },
            findNodesByTagName: function(node, tagName) {
                if (!node || !tagName || !node.getElementsByTagName) {
                    return [];
                }

                var foundNodes = node.getElementsByTagName(tagName);

                return this.htmlCollectionToArray(foundNodes);
            },
            makeNodesUnique: function(nodes) {
                var copy = [].concat(nodes);
                nodes.sort(function(n1, n2) {
                    if (n1 === n2) {
                        return 0;
                    }

                    var index1 = indexOfArray(copy, n1);
                    var index2 = indexOfArray(copy, n2);

                    if (index1 === index2) {
                        return 0;
                    }

                    return index1 > index2 ? -1 : 1;
                });

                if (nodes.length <= 1) {
                    return nodes;
                }

                var index = 0;
                var numDuplicates = 0;
                var duplicates = [];
                var node;

                node = nodes[index++];

                while (node) {
                    if (node === nodes[index]) {
                        numDuplicates = duplicates.push(index);
                    }

                    node = nodes[index++] || null;
                }

                while (numDuplicates--) {
                    nodes.splice(duplicates[numDuplicates], 1);
                }

                return nodes;
            },
            getAttributeValueFromNode: function(node, attributeName) {
                if (!this.hasNodeAttribute(node, attributeName)) {
                    return;
                }

                if (node && node.getAttribute) {
                    return node.getAttribute(attributeName);
                }

                if (!node || !node.attributes) {
                    return;
                }

                var typeOfAttr = typeof node.attributes[attributeName];
                if ('undefined' === typeOfAttr) {
                    return;
                }

                if (node.attributes[attributeName].value) {
                    return node.attributes[attributeName].value; // nodeValue is deprecated ie Chrome
                }

                if (node.attributes[attributeName].nodeValue) {
                    return node.attributes[attributeName].nodeValue;
                }

                var index;
                var attrs = node.attributes;

                if (!attrs) {
                    return;
                }

                for (index = 0; index < attrs.length; index++) {
                    if (attrs[index].nodeName === attributeName) {
                        return attrs[index].nodeValue;
                    }
                }

                return null;
            },
            hasNodeAttributeWithValue: function(node, attributeName) {
                var value = this.getAttributeValueFromNode(node, attributeName);

                return !!value;
            },
            hasNodeAttribute: function(node, attributeName) {
                if (node && node.hasAttribute) {
                    return node.hasAttribute(attributeName);
                }

                if (node && node.attributes) {
                    var typeOfAttr = typeof node.attributes[attributeName];
                    return 'undefined' !== typeOfAttr;
                }

                return false;
            },
            hasNodeCssClass: function(node, klassName) {
                if (node && klassName && node.className) {
                    var classes = typeof node.className === 'string' ? node.className.split(' ') : [];
                    if (-1 !== indexOfArray(classes, klassName)) {
                        return true;
                    }
                }

                return false;
            },
            isLinkElement: function(node) {
                if (!node) {
                    return false;
                }

                var elementName = String(node.nodeName).toLowerCase();
                var linkElementNames = ['a', 'area'];
                var pos = indexOfArray(linkElementNames, elementName);

                return pos !== -1;
            },
            addHiddenElement: function(node, name, value) {
                var elHiddenParam = document.querySelector("[name='" + name + "']");

                if (elHiddenParam) {
                    elHiddenParam.value = value;
                } else {
                    var elNewInput = document.createElement('input');

                    elNewInput.setAttribute('type', 'hidden');

                    elNewInput.setAttribute('name', name);

                    elNewInput.setAttribute('value', value);

                    node.appendChild(elNewInput);
                }
            },
        };

        /*
         * Caliban Tracker class
         *
         * trackerUrl and trackerPropertyId are optional arguments to the constructor
         *
         * See: Tracker.setTrackerUrl() and Tracker.setPropertyId()
         */
        function Tracker(trackerUrl, propertyId) {
            /************************************************************
             * Private members
             ************************************************************/

            var trackerInstance = this,
                // Current URL and Referrer URL
                locationArray = urlFixup(documentAlias.domain, windowAlias.location.href, getReferrer()),
                domainAlias = domainFixup(locationArray[0]),
                locationHrefAlias = safeDecodeWrapper(locationArray[1]),
                configReferrerUrl = safeDecodeWrapper(locationArray[2]),
                // Tracker URL
                configTrackerUrl = trackerUrl || '',
                // Site ID
                configTrackerPropertyId = propertyId || '',
                // User ID
                configUserId = configUserId || '',
                // Session UUID
                sessionReferenceId = '',
                // Session UUID stored on client that is being overwritten
                prevSessionReferenceId = '',
                // Used to pass external data into tracker for modifying DOM and events
                sessionData = null,
                // Override document URL
                configCustomUrl,
                // Hosts or alias(es) to not treat as outlinks
                configHostsAlias = [domainAlias],
                // HTML anchor element classes to not track
                configIgnoreClasses = [],
                // HTML anchor element classes to treat at outlinks
                configLinkClasses = [],
                // Maximum delay to wait for web bug image to be fetched (in milliseconds)
                configTrackerPause = 500,
                // Disallow hash tags in URL
                configDiscardHashTag,
                // Params to suppress from being tracked
                configIgnoreParams = ['_id'],
                // Params to append to all outbound links and forms
                configAppendParams,
                // Params to only add on first attribution
                configFirstAttributionParams = ['gauid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
                // Params to check for which indicate this is the beginning of a new campaign/session
                configCampaignStartParams = ['utm_campaign', 'gclid', 'msclkid'],
                // Additional key/value pairs that will be stored with sess
                sessionExtraData = {},
                // Will add all form field input names as an array under a parent key
                // i.e. <input type="hidden" name="mynamespace[param_1]" /> instead of <input type="hidden" name="param_1" />
                configFormInputNamespace,
                // The URL parameter that will store the sessionId if cross domain linking is enabled.
                // The first part of this URL parameter will be 16 char session Id.
                // The second part is the 10 char current timestamp and the third and last part will be a 6 characters deviceId
                // timestamp is needed to prevent reusing the sessionId when the URL is shared. The sessionId will be
                // only reused if the timestamp is less than 45 seconds old.
                // deviceId parameter is needed to prevent reusing the sessionId when the URL is shared. The sessionId
                // will be only reused if the device is still the same when opening the link.
                configSessionIdParam = '_cbnsid',
                // Cross domain linking, the session ID is transmitted only in the set number seconds following the click.
                configSessionIdParamTimeoutInSeconds = 180,
                // First-party cookie domain
                // User agent defaults to origin hostname
                configCookieDomain,
                // First-party cookie path
                // Default is user agent defined.
                configCookiePath,
                // Whether to use "Secure" cookies that only work over SSL
                configCookieIsSecure = true,
                // First-party cookies are disabled
                configCookiesDisabled = false,
                // Do Not Track
                configDoNotTrack = false,
                // Life of the session  (in milliseconds)
                configSessionTimeout = 7200000, // 2 hours
                // Used for console debugging and other tooling in development
                configDebug = false,
                // Browser features via client-side data collection
                browserFeatures = {},
                // Guard to prevent empty visits see #6415. If there is a new visitor and the first 2 (or 3 or 4)
                // tracking requests are at nearly same time (eg trackPageView and trackContentImpression) 2 or more
                // visits will be created
                timeNextTrackingRequestCanBeExecutedImmediately = false,
                // Guard against installing the link tracker more than once per Tracker instance
                linkTrackingInstalled = false,
                linkTrackingEnabled = false,
                crossDomainTrackingEnabled = true,
                // Timestamp of last tracker request sent to Caliban
                lastTrackerRequestTime = null,
                // Internal state of the pseudo click handler
                lastButton,
                lastTarget,
                // Hash function
                hash = sha1,
                // Domain hash value
                domainHash,
                // Cookies to remove when cleaning up
                configCookiesToDelete = ['id', 'cbn'],
                // Save result of checking if cookies are available
                hasCookiesResult;

            /*
             * Set cookie value
             */
            function setCookie(cookieName, value, msToExpire, path, domain, isSecure) {
                if (configCookiesDisabled) {
                    return;
                }

                var expiryDate;

                // relative time to expire in milliseconds
                if (msToExpire) {
                    expiryDate = new Date();
                    expiryDate.setTime(expiryDate.getTime() + msToExpire);
                }

                documentAlias.cookie =
                    cookieName +
                    '=' +
                    encodeWrapper(value) +
                    (msToExpire ? ';expires=' + expiryDate.toGMTString() : '') +
                    ';path=' +
                    (path || '/') +
                    ';samesite=none' +
                    (domain ? ';domain=' + domain : '') +
                    (isSecure ? ';secure' : '');
            }

            /*
             * Get cookie value
             */
            function getCookie(cookieName) {
                if (configCookiesDisabled) {
                    return 0;
                }

                var cookiePattern = new RegExp('(^|;)[ ]*' + cookieName + '=([^;]*)'),
                    cookieMatch = cookiePattern.exec(documentAlias.cookie);

                return cookieMatch ? decodeWrapper(cookieMatch[2]) : 0;
            }

            /*
             * Removes hash tag from the URL
             *
             * URLs are purified before being recorded in the cookie,
             * or before being sent as GET parameters
             */
            function purify(url) {
                var targetPattern;

                // we need to remove this parameter here, they wouldn't be removed in Caliban tracker otherwise eg
                // for outlinks or referrers
                url = removeUrlParameter(url, configSessionIdParam);

                if (configDiscardHashTag) {
                    targetPattern = new RegExp('#.*');

                    return url.replace(targetPattern, '');
                }

                return url;
            }

            /*
             * Resolve relative reference
             *
             * Note: not as described in rfc3986 section 5.2
             */
            function resolveRelativeReference(baseUrl, url) {
                var protocol = getProtocolScheme(url),
                    i;

                if (protocol) {
                    return url;
                }

                if (url.slice(0, 1) === '/') {
                    return getProtocolScheme(baseUrl) + '://' + getHostName(baseUrl) + url;
                }

                baseUrl = purify(baseUrl);

                i = baseUrl.indexOf('?');
                if (i >= 0) {
                    baseUrl = baseUrl.slice(0, i);
                }

                i = baseUrl.lastIndexOf('/');
                if (i !== baseUrl.length - 1) {
                    baseUrl = baseUrl.slice(0, i + 1);
                }

                return baseUrl + url;
            }

            function isSameHost(hostName, alias) {
                var offset;

                hostName = String(hostName).toLowerCase();
                alias = String(alias).toLowerCase();

                if (hostName === alias) {
                    return true;
                }

                if (alias.slice(0, 1) === '.') {
                    if (hostName === alias.slice(1)) {
                        return true;
                    }

                    offset = hostName.length - alias.length;

                    if (offset > 0 && hostName.slice(offset) === alias) {
                        return true;
                    }
                }

                return false;
            }

            /*
             * Extract pathname from URL. element.pathname is actually supported by pretty much all browsers including
             * IE6 apart from some rare very old ones
             */
            function getPathName(url) {
                var parser = document.createElement('a');
                if (url.indexOf('//') !== 0 && url.indexOf('http') !== 0) {
                    if (url.indexOf('*') === 0) {
                        url = url.substr(1);
                    }
                    if (url.indexOf('.') === 0) {
                        url = url.substr(1);
                    }
                    url = 'http://' + url;
                }

                parser.href = content.toAbsoluteUrl(url);

                if (parser.pathname) {
                    return parser.pathname;
                }

                return '';
            }

            /**
             * Whether the specified domain name and path belong to any of the alias domains (eg. set via setDomains).
             *
             * Note: this function is used to determine whether a click on a URL will be considered an "Outlink".
             *
             * @param host
             * @returns {boolean}
             */
            function isInternalDomain(host) {
                var i, aliasHost;

                for (i = 0; i < configHostsAlias.length; i++) {
                    aliasHost = domainFixup(configHostsAlias[i]);

                    if (isSameHost(host, aliasHost)) {
                        return true;
                    }
                }

                return false;
            }

            /*
             * Is the host local? (i.e., not an outlink)
             */
            function isCurrentHostName(hostName) {
                var i, alias, offset;

                for (i = 0; i < configHostsAlias.length; i++) {
                    alias = domainFixup(configHostsAlias[i].toLowerCase());

                    if (hostName === alias) {
                        return true;
                    }

                    if (alias.slice(0, 1) === '.') {
                        if (hostName === alias.slice(1)) {
                            return true;
                        }

                        offset = hostName.length - alias.length;

                        if (offset > 0 && hostName.slice(offset) === alias) {
                            return true;
                        }
                    }
                }

                return false;
            }

            /*
             * Send script request to Caliban server using GET.
             * The response is a script that is loaded by the server
             */
            function getJs(request, callback) {
                // Change request to use JS response type
                request = addUrlParameter(request, 'send_js', 1);

                var script = documentAlias.createElement('script'),
                    scriptTags = documentAlias.getElementsByTagName('script')[0];

                script.type = 'text/javascript';
                script.async = true;
                script.defer = true;

                script.onload = function() {
                    iterator = 0; // To avoid JSLint warning of empty block
                    if (typeof callback === 'function') {
                        callback({ request: request, trackerUrl: configTrackerUrl, success: true });
                    }
                };
                script.onerror = function() {
                    if (typeof callback === 'function') {
                        callback({ request: request, trackerUrl: configTrackerUrl, success: false });
                    }
                };

                script.src = request;

                scriptTags.parentNode.insertBefore(script, scriptTags);
            }

            /*
             * Send image request to Caliban server using GET.
             * The infamous web bug (or beacon) is a transparent, single pixel (1x1) image
             */
            function getImage(request, callback) {
                // make sure to actually load an image so callback gets invoked
                // request = request.replace("send_image=0", "send_image=1");

                // Change request to use image response type
                request = addUrlParameter(request, 'send_image', 1);

                var image = new Image(1, 1);
                image.onload = function() {
                    iterator = 0; // To avoid JSLint warning of empty block
                    if (typeof callback === 'function') {
                        callback({ request: request, trackerUrl: configTrackerUrl, success: true });
                    }
                };
                image.onerror = function() {
                    if (typeof callback === 'function') {
                        callback({ request: request, trackerUrl: configTrackerUrl, success: false });
                    }
                };
                image.src = configTrackerUrl + (configTrackerUrl.indexOf('?') < 0 ? '?' : '&') + request;
            }

            /*
             * Send request
             */
            function sendRequest(request, delay, callback) {
                if (!configDoNotTrack && request) {
                    // Build full request
                    request = configTrackerUrl + (configTrackerUrl.indexOf('?') < 0 ? '?' : '&') + request;

                    getJs(request, callback);

                    // TODO: No longer used but possibly add a config option
                    // getImage(request, callback);
                }
            }

            function deleteCookie(cookieName, path, domain) {
                setCookie(cookieName, '', -86400, path, domain);
            }

            /*
             * Does browser have cookies enabled (for this site)?
             */
            function hasCookies() {
                if (configCookiesDisabled) {
                    return '0';
                }

                // If previously tested, return that value instead of reading/writing test cookie again
                if (hasCookiesResult) {
                    return hasCookiesResult;
                }

                if (!isDefined(windowAlias.showModalDialog) && isDefined(navigatorAlias.cookieEnabled)) {
                    hasCookiesResult = navigatorAlias.cookieEnabled ? '1' : '0';
                    return hasCookiesResult;
                }

                // for IE we want to actually set the cookie to avoid trigger a warning eg in IE see #11507
                var testCookieName = 'cbn_testcookie';
                setCookie(testCookieName, '1', undefined, configCookiePath, configCookieDomain, configCookieIsSecure);

                var hasCookie = getCookie(testCookieName) === '1' ? '1' : '0';
                deleteCookie(testCookieName);

                // Update cookies disabled if we are unable to read/write test cookie
                if (!hasCookiesResult) {
                    hasCookiesResult = hasCookie;
                }

                return hasCookie;
            }

            /*
             * Update domain hash
             */
            function updateDomainHash() {
                domainHash = hash((configCookieDomain || domainAlias) + (configCookiePath || '/')).slice(0, 4); // 4 hexits = 16 bits
            }

            /*
             * Browser features (plugins, resolution, cookies) used for rudiemntary device detection for cross-domain linking
             */
            function detectBrowserFeatures() {
                // Features already set
                if (isDefined(browserFeatures.res)) {
                    return browserFeatures;
                }

                var i,
                    mimeType,
                    pluginMap = {
                        // document types
                        pdf: 'application/pdf',

                        // media players
                        qt: 'video/quicktime',
                        realp: 'audio/x-pn-realaudio-plugin',
                        wma: 'application/x-mplayer2',

                        // interactive multimedia
                        dir: 'application/x-director',
                        fla: 'application/x-shockwave-flash',

                        // RIA
                        java: 'application/x-java-vm',
                        gears: 'application/x-googlegears',
                        ag: 'application/x-silverlight',
                    };

                // detect browser features except IE < 11 (IE 11 user agent is no longer MSIE)
                if (!new RegExp('MSIE').test(navigatorAlias.userAgent)) {
                    // general plugin detection
                    if (navigatorAlias.mimeTypes && navigatorAlias.mimeTypes.length) {
                        for (i in pluginMap) {
                            if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
                                mimeType = navigatorAlias.mimeTypes[pluginMap[i]];
                                browserFeatures[i] = mimeType && mimeType.enabledPlugin ? '1' : '0';
                            }
                        }
                    }

                    // Safari and Opera
                    // IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
                    // on Edge navigator.javaEnabled() always returns `true`, so ignore it
                    if (
                        !new RegExp('Edge[ /](\\d+[\\.\\d]+)').test(navigatorAlias.userAgent) &&
                        typeof navigator.javaEnabled !== 'unknown' &&
                        isDefined(navigatorAlias.javaEnabled) &&
                        navigatorAlias.javaEnabled()
                    ) {
                        browserFeatures.java = '1';
                    }

                    // Firefox
                    if (isFunction(windowAlias.GearsFactory)) {
                        browserFeatures.gears = '1';
                    }

                    // other browser features
                    browserFeatures.cookie = hasCookies();
                }

                var width = parseInt(screenAlias.width, 10);
                var height = parseInt(screenAlias.height, 10);
                browserFeatures.res = parseInt(width, 10) + 'x' + parseInt(height, 10);
                return browserFeatures;
            }

            /*
             * Generate a pseudo-unique ID to fingerprint this session
             * 20 hexits = 10 bytes
             * note: this isn't a RFC4122-compliant UUID
             */
            function generateRandomUuid() {
                var browserFeatures = detectBrowserFeatures();
                return hash(
                    (navigatorAlias.userAgent || '') +
                        (navigatorAlias.platform || '') +
                        JSON.stringify(browserFeatures) +
                        new Date().getTime() +
                        Math.random()
                ).slice(0, 20);
            }

            function generateBrowserSpecificId() {
                var browserFeatures = detectBrowserFeatures();

                return hash((navigatorAlias.userAgent || '') + (navigatorAlias.platform || '') + JSON.stringify(browserFeatures)).slice(
                    0,
                    6
                );
            }

            function getCurrentTimestampInSeconds() {
                return Math.floor(new Date().getTime() / 1000);
            }

            function makeCrossDomainDeviceId() {
                var timestamp = getCurrentTimestampInSeconds();
                var browserId = generateBrowserSpecificId();
                var deviceId = String(timestamp) + browserId;

                return deviceId;
            }

            function isSameCrossDomainDevice(deviceIdFromUrl) {
                deviceIdFromUrl = String(deviceIdFromUrl);

                var thisBrowserId = generateBrowserSpecificId();
                var lengthBrowserId = thisBrowserId.length;

                var browserIdInUrl = deviceIdFromUrl.substr(-1 * lengthBrowserId, lengthBrowserId);
                var timestampInUrl = parseInt(deviceIdFromUrl.substr(0, deviceIdFromUrl.length - lengthBrowserId), 10);

                configDebug &&
                    console.log('[CALIBAN_DEBUG] Verifying device Id (' + thisBrowserId + ') and Id from URL (' + browserIdInUrl + ')');

                if (timestampInUrl && browserIdInUrl && browserIdInUrl === thisBrowserId) {
                    // we only reuse sessionId when used on same device / browser

                    var currentTimestampInSeconds = getCurrentTimestampInSeconds();

                    if (configSessionIdParamTimeoutInSeconds <= 0) {
                        configDebug && console.log('[CALIBAN_DEBUG] Cross-domain same user: ', true);
                        return true;
                    }

                    var idValidSecondsRemaining = timestampInUrl - currentTimestampInSeconds + configSessionIdParamTimeoutInSeconds;

                    configDebug &&
                        console.log(
                            '[CALIBAN_DEBUG] Cross-domain timestamps: current (' +
                                currentTimestampInSeconds +
                                ') fromUrl (' +
                                timestampInUrl +
                                ')'
                        );

                    configDebug &&
                        console.log(
                            '[CALIBAN_DEBUG] Cross-domain Id timestamp ' +
                                (idValidSecondsRemaining > 0
                                    ? 'valid for ' + idValidSecondsRemaining + 's'
                                    : 'expired ' + idValidSecondsRemaining * -1 + 's ago')
                        );

                    if (timestampInUrl >= currentTimestampInSeconds - configSessionIdParamTimeoutInSeconds) {
                        // we only use sessionId if it was generated max 180 seconds ago
                        configDebug && console.log('[CALIBAN_DEBUG] Cross-domain same user: ', true);
                        return true;
                    }
                }

                configDebug && console.log('[CALIBAN_DEBUG] Cross-domain same user: ', false);
                return false;
            }

            function getSessionIdFromUrl(url) {
                if (!crossDomainTrackingEnabled) {
                    configDebug && console.log('[CALIBAN_DEBUG] Cross-domain sessions disabled');
                    return null;
                }

                // problem different timezone or when the time on the computer is not set correctly it may re-use
                // the same sessionId again. therefore we also have a factor like hashed user agent to reduce possible
                // activation of a sessionId on other device
                var crossDomainSessionId = getUrlParameter(url, configSessionIdParam);

                if (!crossDomainSessionId) {
                    return null;
                }

                var crossDomainSessionIdParts = crossDomainSessionId.split('.');

                var sessionId = crossDomainSessionIdParts[0],
                    deviceId = crossDomainSessionIdParts.length > 1 ? crossDomainSessionIdParts[1] : null;

                configDebug && console.log('[CALIBAN_DEBUG] Get session Id from URL: ' + sessionId);

                if (!sessionId) {
                    return null;
                }

                configDebug && console.log('[CALIBAN_DEBUG] Get device Id from URL: ' + deviceId);

                if (!deviceId || (deviceId && isSameCrossDomainDevice(deviceId))) {
                    return String(sessionId);
                }

                return null;
            }

            /*
             * Load session reference Id if exising session
             */
            function loadSessionReferenceId() {
                configDebug && console.log('[CALIBAN_DEBUG] Get session Id: ' + (sessionReferenceId || '(not yet set)'));

                if (!sessionReferenceId) {
                    // We are using locationHrefAlias and not currentUrl on purpose to for sure get the passed URL parameters
                    // from original URL
                    sessionReferenceId = getSessionIdFromUrl(locationHrefAlias);
                    // sessionReferenceId = getSessionIdFromUrl(locationHrefAlias) || getCookie(configSessionIdParam);

                    configDebug && console.log('[CALIBAN_DEBUG] Found valid session Id in URL: ' + sessionReferenceId);

                    // If not found in the URL and not the begining of a new campaign then look for session reference Id in cookies
                    // We do not care about a cookied session if we deem this to be the start of a new campaign
                    if (!sessionReferenceId) {
                        var isNewCampaign = isCampaignStart(),
                            cookiedSessionReferenceId = getCookie(configSessionIdParam);

                        prevSessionReferenceId = isNewCampaign ? cookiedSessionReferenceId : null;
                        sessionReferenceId = !isNewCampaign ? cookiedSessionReferenceId : null;
                    }

                    // NOTE: We were using this logic, but what if referrer is blocked and we're mid-funnel. The cookied session would be ignored.
                    // Referrer is simply not reliable enough to use here

                    // Following condition must be true to retrieve stored session:
                    // 1. Session reference Id is retrieved
                    // 2. Referrer is NOT empty (this indicates a direct entry from outside browser or explicitly blocked)
                    // 3. Referrer domain is same as current domain
                    // if (cookiedSessionReferenceId && configReferrerUrl && startsUrlWithTrackerUrl(configReferrerUrl)) {
                    //
                    // }
                }

                return sessionReferenceId;
            }

            function isCampaignStart() {
                var currentUrl = configCustomUrl || locationHrefAlias;

                for (var index = 0; index < configCampaignStartParams.length; index++) {
                    if (getUrlParameter(currentUrl, configCampaignStartParams[index])) {
                        configDebug &&
                            console.log(
                                '[CALIBAN_DEBUG] Starting new campaign/session, `' + configCampaignStartParams[index] + '` found in request'
                            );
                        return true;
                    }
                }

                configDebug && console.log('[CALIBAN_DEBUG] No campaign start params found in request');

                return false;
            }

            function isPossibleToSetCookieOnDomain(domainToTest) {
                var valueToSet = 'testvalue';
                setCookie('test', valueToSet, 10000, null, domainToTest);

                if (getCookie('test') === valueToSet) {
                    deleteCookie('test', null, domainToTest);

                    return true;
                }

                return false;
            }

            function deleteCookies() {
                var savedConfigCookiesDisabled = configCookiesDisabled;

                // Temporarily allow cookies just to delete the existing ones
                configCookiesDisabled = false;

                var index, cookieName;

                for (index = 0; index < configCookiesToDelete.length; index++) {
                    cookieName = configCookiesToDelete[index];
                    if (0 !== getCookie(cookieName)) {
                        deleteCookie(cookieName, configCookiePath, configCookieDomain);
                    }
                }

                // Also clear the session reference cookie
                deleteCookie(configSessionIdParam, configCookiePath, configCookieDomain);

                configCookiesDisabled = savedConfigCookiesDisabled;
            }

            function setPropertyId(propertyId) {
                configTrackerPropertyId = propertyId;
            }

            /**
             * Creates the session cookie
             */
            function setSessionCookie(sessionReferenceId) {
                setCookie(
                    configSessionIdParam,
                    sessionReferenceId,
                    configSessionTimeout,
                    configCookiePath,
                    configCookieDomain,
                    configCookieIsSecure
                );
            }

            /**
             * Returns the URL to send to the server.
             * Sends the pageview and browser settings with every request in case of race conditions.
             */
            function getRequest(request) {
                var currentUrl = configCustomUrl || locationHrefAlias,
                    newSession = false;

                if (configCookiesDisabled) {
                    deleteCookies();
                }

                if (configDoNotTrack) {
                    return '';
                }

                // send charset if document charset is not utf-8. sometimes encoding
                // of urls will be the same as this and not utf-8, which will cause problems
                // do not send charset if it is utf8 since it's assumed by default in Caliban
                var charSet = documentAlias.characterSet || documentAlias.charset;

                if (!charSet || charSet.toLowerCase() === 'utf-8') {
                    charSet = null;
                }

                // Must pass a parameter for new session since the the cookie is already set, we may still be on the same domain
                // and referer is unreliable, so any assumptions could be wrong.
                if (!loadSessionReferenceId()) {
                    // Session Id was not found or we recieved a campaign start parameter: we consider this the start of a 'session'
                    sessionReferenceId = generateRandomUuid();

                    newSession = true;

                    configDebug && console.log('[CALIBAN_DEBUG] Generated new session Id:' + sessionReferenceId);

                    configDebug && console.log('[CALIBAN_DEBUG] Previous session Id was:' + prevSessionReferenceId);
                }

                // build out the rest of the request
                request =
                    ((request && request + '&') || '') +
                    'sid=' +
                    configTrackerPropertyId +
                    ('&' + configSessionIdParam + '=' + sessionReferenceId) +
                    ('&link_' + configSessionIdParam + '=' + prevSessionReferenceId) +
                    '&r=' +
                    String(Math.random()).slice(2, 8) + // keep the string to a minimum
                    '&ts=' +
                    getCurrentTimestampInSeconds() +
                    '&uid=' +
                    configUserId +
                    '&url=' +
                    encodeWrapper(purify(currentUrl)) +
                    (configReferrerUrl.length ? '&urlref=' + encodeWrapper(purify(configReferrerUrl)) : '') +
                    (configIgnoreParams && configIgnoreParams.length ? '&ignr=' + encodeWrapper(configIgnoreParams) : '') +
                    (configAppendParams && configAppendParams.length ? '&apnd=' + encodeWrapper(configAppendParams) : '') +
                    (configFirstAttributionParams && configFirstAttributionParams.length
                        ? '&fattr=' + encodeWrapper(configFirstAttributionParams)
                        : '') +
                    (configCampaignStartParams && configCampaignStartParams.length
                        ? '&cmpst=' + encodeWrapper(configCampaignStartParams)
                        : '') +
                    (!isObjectEmpty(sessionExtraData) ? '&cdata=' + encodeWrapper(JSON.stringify(sessionExtraData)) : '') +
                    '&ces=' +
                    Math.floor(configSessionTimeout / 1000) +
                    // '&cdid=' + makeCrossDomainDeviceId() +
                    (charSet ? '&cs=' + encodeWrapper(charSet) : '') +
                    '&dnt=' +
                    configDoNotTrack +
                    '&snew=' +
                    newSession;

                var browserFeatures = detectBrowserFeatures();

                configDebug && console.log('[CALIBAN_DEBUG] Browser Features: ', browserFeatures);

                // browser features
                for (var i in browserFeatures) {
                    if (Object.prototype.hasOwnProperty.call(browserFeatures, i)) {
                        request += '&' + i + '=' + browserFeatures[i];
                    }
                }

                // update cookie
                setSessionCookie(sessionReferenceId);

                return request;
            }

            /*
             * Construct regular expression of classes
             */
            function getClassesRegExp(configClasses, defaultClass) {
                var i,
                    classesRegExp = '(^| )(cbn[_-]' + defaultClass;

                if (configClasses) {
                    for (i = 0; i < configClasses.length; i++) {
                        classesRegExp += '|' + configClasses[i];
                    }
                }

                classesRegExp += ')( |$)';

                return new RegExp(classesRegExp);
            }

            function isSameHostname(url1, url2) {
                return 0 === getHostName(url1).indexOf(getHostName(url2));
            }

            function startsUrlWithTrackerUrl(url) {
                return configTrackerUrl && url && (0 === url.indexOf('/') || 0 === getHostName(url).indexOf(getHostName(configTrackerUrl)));
            }

            function getSourceElement(sourceElement) {
                var parentElement;

                parentElement = sourceElement.parentNode;
                while (
                    parentElement !== null &&
                    /* buggy IE5.5 */
                    isDefined(parentElement)
                ) {
                    if (query.isLinkElement(sourceElement)) {
                        break;
                    }
                    sourceElement = parentElement;
                    parentElement = sourceElement.parentNode;
                }

                return sourceElement;
            }

            function replaceHrefForCrossDomainLink(element) {
                if (!element) {
                    return;
                }

                if (!query.hasNodeAttribute(element, 'href')) {
                    return;
                }

                var link = query.getAttributeValueFromNode(element, 'href');

                // If link remains on the same domain AND user has cookies enabled then do not append session Id
                if (!link || (startsUrlWithTrackerUrl(link) && hasCookies() === '1') || link.indexOf('#') === 0) {
                    configDebug && console.log('[CALIBAN_DEBUG] No cross-domain reference needed');
                    return;
                }

                // we need to remove the parameter and add it again if needed to make sure we have latest timestamp
                link = removeUrlParameter(link, configSessionIdParam);

                var crossDomainSessionId = loadSessionReferenceId() + '.' + makeCrossDomainDeviceId();

                link = addUrlParameter(link, configSessionIdParam, crossDomainSessionId);

                configDebug && console.log('[CALIBAN_DEBUG] Adding cross-domain reference #' + crossDomainSessionId);

                element.setAttribute('href', link);
            }

            function addLinkAppendParams(element) {
                configDebug && console.log('[CALIBAN_DEBUG] Append qs params to link #' + element.id);

                if (!element || !configAppendParams) {
                    return;
                }

                if (!query.hasNodeAttribute(element, 'href')) {
                    return;
                }

                var link = query.getAttributeValueFromNode(element, 'href');

                // Return if link is empty or a named anchor
                if (!link || link.indexOf('#') === 0) {
                    configDebug && console.log('[CALIBAN_DEBUG] Not processing link append for: ' + link);
                    return;
                }

                configDebug && console.log('[CALIBAN_DEBUG] Link append href (before): ' + link);

                var currentUrl = configCustomUrl || locationHrefAlias;

                var index, appendParam, paramValue;

                for (index = 0; index < configAppendParams.length; index++) {
                    appendParam = configAppendParams[index];

                    // Ignore appendParams if they are also campaignStartParams or this would create an endless loop of restarting the session on every subsequent page
                    // TODO: Should we also exlclude static params like UTM and/or configFirstAttributionParams since they won't be stored after landing page?
                    if (
                        !configCampaignStartParams.length ||
                        (configCampaignStartParams.length && configCampaignStartParams.indexOf(appendParam) === -1)
                    ) {
                        paramValue = getUrlParameter(currentUrl, appendParam);

                        if (paramValue.length) {
                            configDebug && console.log('[CALIBAN_DEBUG] Append qs param: ' + appendParam + ' = ' + paramValue);

                            link = removeUrlParameter(link, appendParam);

                            link = addUrlParameter(link, appendParam, paramValue);
                        } else {
                            configDebug && console.log('[CALIBAN_DEBUG] Skipping empty append qs param: ' + appendParam);
                        }
                    }
                }

                configDebug && console.log('[CALIBAN_DEBUG] Link append href (after): ' + link);

                element.setAttribute('href', link);
            }

            function addFormParams(element) {
                configDebug && console.log('[CALIBAN_DEBUG] Adding form data to `' + (element.id || element.name) + '`: ', sessionData);

                if (!element || !sessionData) {
                    return;
                }

                if (element.nodeName !== 'FORM') {
                    return;
                }

                addFormParamFields(element, sessionData, configFormInputNamespace);

                var sessionId = loadSessionReferenceId();

                // Add session reference Id to form as well
                query.addHiddenElement(element, configSessionIdParam, sessionId);

                configDebug && console.log('[CALIBAN_DEBUG] Adding hidden field ' + configSessionIdParam + ' = ' + sessionId);
            }

            function addFormParamFields(formElement, fieldsData, fieldPrefix) {
                for (var sessionParam in fieldsData) {
                    // Skip ignored params which are either utility in nature or should never be tracked
                    if (configIgnoreParams.indexOf(sessionParam) === -1) {
                        var fieldName = fieldPrefix ? fieldPrefix + '[' + sessionParam + ']' : sessionParam;

                        // If an object, add recursively
                        if (typeof fieldsData[sessionParam] === 'object') {
                            addFormParamFields(formElement, fieldsData[sessionParam], fieldName);
                        } else {
                            // Add hidden form field
                            query.addHiddenElement(formElement, fieldName, fieldsData[sessionParam]);

                            configDebug &&
                                console.log('[CALIBAN_DEBUG] Adding hidden field ' + fieldName + ' = ' + fieldsData[sessionParam]);
                        }
                    }
                }
            }

            // function isLinktoInternalDomain(element)
            // {
            // 	var targetLink = query.getAttributeValueFromNode(element, 'href');
            //
            // 	if (!targetLink) {
            // 		return false;
            // 	}
            //
            // 	targetLink = String(targetLink);
            //
            // 	var isAbsoluteLink = targetLink.indexOf('//') === 0
            // 		|| targetLink.indexOf('http://') === 0
            // 		|| targetLink.indexOf('https://') === 0;
            //
            // 	if (!isAbsoluteLink) {
            // 		return false;
            // 	}
            //
            // 	var originalSourceHostName = (element.hostname || getHostName(element.href)).toLowerCase();
            //
            // 	if (isInternalDomain(originalSourceHostName)) {
            // 		if (!isSameHost(domainAlias, domainFixup(originalSourceHostName))) {
            // 			return true;
            // 		}
            //
            // 		return false;
            // 	}
            //
            // 	return false;
            // }

            /*
             * Process clicks
             */
            function processClick(sourceElement) {
                // in case the clicked element is within the <a> (for example there is a <div> within the <a>) this will get the actual <a> link element
                sourceElement = getSourceElement(sourceElement);

                configDebug && console.log('Handle click: ' + sourceElement.href || null);

                // Set any append params to all link clicks
                addLinkAppendParams(sourceElement);

                // a link to same domain or the same website (as set in setDomains())
                if (crossDomainTrackingEnabled) {
                    // if(isLinkToInternalDomain(sourceElement)) {
                    replaceHrefForCrossDomainLink(sourceElement);
                    // }

                    configDebug && console.log('[CALIBAN_DEBUG] Click processed ' + sourceElement.href || null);
                }
            }

            function isIE8orOlder() {
                return documentAlias.all && !documentAlias.addEventListener;
            }

            function getKeyCodeFromEvent(event) {
                // event.which is deprecated https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/which
                var which = event.which;

                /**
				 1 : Left mouse button
				 2 : Wheel button or middle button
				 3 : Right mouse button
				 */

                var typeOfEventButton = typeof event.button;

                if (!which && typeOfEventButton !== 'undefined') {
                    /**
					 -1: No button pressed
					 0 : Main button pressed, usually the left button
					 1 : Auxiliary button pressed, usually the wheel button or themiddle button (if present)
					 2 : Secondary button pressed, usually the right button
					 3 : Fourth button, typically the Browser Back button
					 4 : Fifth button, typically the Browser Forward button

					 IE8 and earlier has different values:
					 1 : Left mouse button
					 2 : Right mouse button
					 4 : Wheel button or middle button

					 For a left-hand configured mouse, the return values are reversed. We do not take care of that.
					 */

                    if (isIE8orOlder()) {
                        if (event.button & 1) {
                            which = 1;
                        } else if (event.button & 2) {
                            which = 3;
                        } else if (event.button & 4) {
                            which = 2;
                        }
                    } else {
                        if (event.button === 0 || event.button === '0') {
                            which = 1;
                        } else if (event.button & 1) {
                            which = 2;
                        } else if (event.button & 2) {
                            which = 3;
                        }
                    }
                }

                return which;
            }

            function getNameOfClickedButton(event) {
                switch (getKeyCodeFromEvent(event)) {
                    case 1:
                        return 'left';
                    case 2:
                        return 'middle';
                    case 3:
                        return 'right';
                }
            }

            function getTargetElementFromEvent(event) {
                return event.target || event.srcElement;
            }

            /*
             * Handle click event
             */
            function clickHandler(enable) {
                return function(event) {
                    event = event || windowAlias.event;

                    var button = getNameOfClickedButton(event);
                    var target = getTargetElementFromEvent(event);

                    if (event.type === 'click') {
                        var ignoreClick = false;
                        if (enable && button === 'middle') {
                            // if enabled, we track middle clicks via mouseup
                            // some browsers (eg chrome) trigger click and mousedown/up events when middle is clicked,
                            // whereas some do not. This way we make "sure" to track them only once, either in click
                            // (default) or in mouseup (if enable == true)
                            ignoreClick = true;
                        }

                        if (target && !ignoreClick) {
                            processClick(target);
                        }
                    } else if (event.type === 'mousedown') {
                        if (button === 'middle' && target) {
                            lastButton = button;
                            lastTarget = target;
                        } else {
                            lastButton = lastTarget = null;
                        }
                    } else if (event.type === 'mouseup') {
                        if (button === lastButton && target === lastTarget) {
                            processClick(target);
                        }
                        lastButton = lastTarget = null;
                    } else if (event.type === 'contextmenu') {
                        processClick(target);
                    }
                };
            }

            /*
             * Add click listener to a DOM element
             */
            function addClickListener(element, enable) {
                var enableType = typeof enable;
                if (enableType === 'undefined') {
                    enable = true;
                }

                addEventListener(element, 'click', clickHandler(enable), false);

                if (enable) {
                    addEventListener(element, 'mouseup', clickHandler(enable), false);
                    addEventListener(element, 'mousedown', clickHandler(enable), false);
                    addEventListener(element, 'contextmenu', clickHandler(enable), false);
                }
            }

            /*
             * Add click handlers to anchor and AREA elements, except those to be ignored
             */
            function addClickListeners(enable, trackerInstance) {
                linkTrackingInstalled = true;

                // iterate through anchor elements with href and AREA elements
                var i,
                    ignorePattern = getClassesRegExp(configIgnoreClasses, 'ignore'),
                    linkElements = documentAlias.links,
                    linkElement = null,
                    trackerType = null;

                if (linkElements) {
                    for (i = 0; i < linkElements.length; i++) {
                        linkElement = linkElements[i];
                        if (!ignorePattern.test(linkElement.className)) {
                            trackerType = typeof linkElement.calibanTrackers;

                            if ('undefined' === trackerType) {
                                linkElement.calibanTrackers = [];
                            }

                            if (-1 === indexOfArray(linkElement.calibanTrackers, trackerInstance)) {
                                // we make sure to setup link only once for each tracker
                                linkElement.calibanTrackers.push(trackerInstance);
                                addClickListener(linkElement, enable);
                            }
                        }
                    }
                }
            }

            /*
             * Handle submit event
             */
            function submitHandler() {
                return function(event) {
                    event = event || windowAlias.event;

                    var target = getTargetElementFromEvent(event);

                    if (event.type === 'submit') {
                        addFormParams(target);
                    }
                };
            }

            /*
             * Add submit listener to a FORM element
             */
            function addSubmitListener(element) {
                addEventListener(element, 'submit', submitHandler(), false);
            }

            /*
             * Add submit handlers to FORM elements, except those to be ignored
             */
            function addSubmitListeners(trackerInstance) {
                // iterate through FORM elements
                var i,
                    ignorePattern = getClassesRegExp(configIgnoreClasses, 'ignore'),
                    formElements = documentAlias.forms,
                    formElement = null,
                    trackerType = null;

                if (formElements) {
                    for (i = 0; i < formElements.length; i++) {
                        formElement = formElements[i];
                        if (!ignorePattern.test(formElement.className)) {
                            trackerType = typeof formElement.calibanTrackers;

                            if ('undefined' === trackerType) {
                                formElement.calibanTrackers = [];
                            }

                            if (-1 === indexOfArray(formElement.calibanTrackers, trackerInstance)) {
                                // we make sure to setup form only once for each tracker
                                formElement.calibanTrackers.push(trackerInstance);

                                // Add event listeners to relevant forms onSubmit
                                addSubmitListener(formElement);
                            }
                        }
                    }
                }
            }

            /*
             * Add session data as hidden inputs to FORM elements, except those set to be ignored.
             * This can be called repeatedly on the same form as session data may change or a form may be rendered after initial DOM load.
             */
            function addFormData(trackerInstance) {
                // iterate through FORM elements
                var i,
                    ignorePattern = getClassesRegExp(configIgnoreClasses, 'ignore'),
                    formElements = documentAlias.forms,
                    formElement = null,
                    formMethod = null,
                    trackerType = null;

                configDebug && console.log('[CALIBAN_DEBUG] Forms found:', formElements ? query.htmlCollectionToArray(formElements) : null);

                if (formElements) {
                    for (i = 0; i < formElements.length; i++) {
                        formElement = formElements[i];

                        configDebug &&
                            console.log('[CALIBAN_DEBUG] Checking eligibility of form `' + (formElement.id || formElement.name) + '`');

                        formMethod = query.getAttributeValueFromNode(formElement, 'method') || '';

                        if (!ignorePattern.test(formElement.className) && formMethod.toUpperCase() === 'POST') {
                            trackerType = typeof formElement.calibanTrackers;

                            configDebug &&
                                console.log('[CALIBAN_DEBUG] Append session data to form `' + (formElement.id || formElement.name) + '`');

                            if ('undefined' === trackerType) {
                                formElement.calibanTrackers = [];
                            }

                            // Add tracker to FORM for accessing API off element later
                            formElement.calibanTrackers.push(trackerInstance);

                            // Appened form params as hidden elements
                            addFormParams(formElement);
                        } else {
                            configDebug && console.log('[CALIBAN_DEBUG] Ignoring form `' + (formElement.id || formElement.name) + '`');
                        }
                    }
                }
            }

            /************************************************************
             * Constructor
             ************************************************************/

            /*
             * initialize tracker
             */
            updateDomainHash();

            /************************************************************
             * Public data and methods
             ************************************************************/

            /**
             * Set the Session Reference ID from calling application
             *
             * @param string sessionId
             */
            this.setSessionReferenceId = function(sessionId) {
                sessionReferenceId = sessionId;
            };

            /**
             * Get Session Reference ID (from URL or first party cookie)
             *
             * @return string Session Reference ID (or empty string, if not yet known)
             */
            this.getSessionReferenceId = function() {
                return loadSessionReferenceId();
            };

            /**
             * Specify the Caliban tracking URL
             *
             * @param string trackerUrl
             */
            this.setTrackerUrl = function(trackerUrl) {
                configTrackerUrl = trackerUrl;
            };

            /**
             * Returns the Caliban tracking URL
             * @returns string
             */
            this.getTrackerUrl = function() {
                return configTrackerUrl;
            };

            /**
             * Returns the Caliban server URL.
             *
             * @returns string
             */
            this.getCalibanUrl = function() {
                return this.getTrackerUrl();
            };

            /**
             * Returns the site ID
             *
             * @returns int
             */
            this.getPropertyId = function() {
                return configTrackerPropertyId;
            };

            /**
             * Specify the site ID
             *
             * @param int|string propertyId
             */
            this.setPropertyId = function(propertyId) {
                setPropertyId(propertyId);
            };

            /**
             * Returns the user ID
             *
             * @returns string
             */
            this.getUserId = function() {
                return configUserId;
            };

            /**
             * Specify the user ID
             *
             * @param string userId
             */
            this.setUserId = function(userId) {
                configUserId = userId;
            };

            /**
             * Returns the query string for the current HTTP Tracking API request.
             * Caliban would prepend the hostname and path to Caliban: http://example.org/caliban/caliban.php?
             * prior to sending the request.
             *
             * @param request eg. "param=value&param2=value2"
             */
            this.getRequest = function(request) {
                return getRequest(request);
            };

            /**
             * Set delay for link tracking (in milliseconds)
             *
             * @param int delay
             */
            this.setLinkTrackingTimer = function(delay) {
                configTrackerPause = delay;
            };

            /**
             * Get delay for link tracking (in milliseconds)
             *
             * @param int delay
             */
            this.getLinkTrackingTimer = function() {
                return configTrackerPause;
            };

            /**
             * Set array of domains to be treated as local. Also supports path, eg '.caliban.org/subsite1'. In this
             * case all links that don't go to '*.caliban.org/subsite1/ *' would be treated as outlinks.
             * For example a link to 'caliban.org/' or 'caliban.org/subsite2' both would be treated as outlinks.
             *
             * Also supports page wildcard, eg 'caliban.org/index*'. In this case all links
             * that don't go to caliban.org/index* would be treated as outlinks.
             *
             * The current domain will be added automatically if no given host alias contains a path and if no host
             * alias is already given for the current host alias. Say you are on "example.org" and set
             * "hostAlias = ['example.com', 'example.org/test']" then the current "example.org" domain will not be
             * added as there is already a more restrictive hostAlias 'example.org/test' given. We also do not add
             * it automatically if there was any other host specifying any path like
             * "['example.com', 'example2.com/test']". In this case we would also not add the current
             * domain "example.org" automatically as the "path" feature is used. As soon as someone uses the path
             * feature, for Caliban JS Tracker to work correctly in all cases, one needs to specify all hosts
             * manually.
             *
             * @param string|array hostsAlias
             */
            this.setDomains = function(hostsAlias) {
                configHostsAlias = isString(hostsAlias) ? [hostsAlias] : hostsAlias;

                var hasDomainAliasAlready = false,
                    i = 0,
                    alias;
                for (i; i < configHostsAlias.length; i++) {
                    alias = String(configHostsAlias[i]);

                    if (isSameHost(domainAlias, domainFixup(alias))) {
                        hasDomainAliasAlready = true;
                        break;
                    }

                    var pathName = getPathName(alias);
                    if (pathName && pathName !== '/' && pathName !== '/*') {
                        hasDomainAliasAlready = true;
                        break;
                    }
                }

                // The current domain will be added automatically if no given host alias contains a path
                // and if no host alias is already given for the current host alias.
                if (!hasDomainAliasAlready) {
                    /**
                     * eg if domainAlias = 'caliban.org' and someone set hostsAlias = ['caliban.org/foo'] then we should
                     * not add caliban.org as it would increase the allowed scope.
                     */
                    configHostsAlias.push(domainAlias);
                }
            };

            /**
             * Enables cross domain linking. By default, the session ID that identifies a unique session is stored in
             * the browser's first party cookies. This means the cookie can only be accessed by pages on the same domain.
             * If you own multiple domains and would like to track all the actions and pageviews of a specific session
             * into the same visit, you may enable cross domain linking. Whenever a user clicks on a link it will append
             * a URL parameter to the clicked URL which consists of these parts: 16 char sessionId, a 10 character
             * current timestamp and the last 6 characters are an id based on the userAgent to identify the users device).
             * This way the current sessionId is forwarded to the page of the different domain.
             *
             * On the different domain, the Caliban tracker will recognize the set sessionId from the URL parameter and
             * reuse this parameter if the page was loaded within 45 seconds. If cross domain linking was not enabled,
             * it would create a new visit on that page because we wouldn't be able to access the previously created
             * cookie. By enabling cross domain linking you can track several different domains into one website and
             * won't lose for example the original referrer.
             */
            this.enableCrossDomainLinking = function() {
                crossDomainTrackingEnabled = true;
            };

            /**
             * Disable cross domain linking if it was previously enabled. See enableCrossDomainLinking();
             */
            this.disableCrossDomainLinking = function() {
                crossDomainTrackingEnabled = false;
            };

            /**
             * Detect whether cross domain linking is enabled or not. See enableCrossDomainLinking();
             * @returns bool
             */
            this.isCrossDomainLinkingEnabled = function() {
                return crossDomainTrackingEnabled;
            };

            /**
             * Returns the query parameter appended to link URLs so cross domain visits
             * can be detected.
             *
             * If your application creates links dynamically, then you'll have to add this
             * query parameter manually to those links (since the JavaScript tracker cannot
             * detect when those links are added).
             *
             * Eg:
             *
             * var url = 'http://myotherdomain.com/?' + calibanTracker.getCrossDomainLinkingUrlParameter();
             * $element.append('<a href="' + url + '"/>');
             */
            this.getCrossDomainLinkingUrlParameter = function() {
                return encodeWrapper(configSessionIdParam) + '=' + encodeWrapper(loadSessionReferenceId());
            };

            /**
             * Set array of classes to be ignored if present in link
             *
             * @param string|array ignoreClasses
             */
            this.setIgnoreClasses = function(ignoreClasses) {
                configIgnoreClasses = isString(ignoreClasses) ? [ignoreClasses] : ignoreClasses;
            };

            /**
             * Override referrer
             *
             * @param string url
             */
            this.setReferrerUrl = function(url) {
                configReferrerUrl = url;
            };

            /**
             * Return the current referrer
             */
            this.getReferrerUrl = function() {
                return configReferrerUrl;
            };

            /**
             * Override url
             *
             * @param string url
             */
            this.setCustomUrl = function(url) {
                configCustomUrl = resolveRelativeReference(locationHrefAlias, url);
            };

            /**
             * Returns the current url of the page that is currently being visited. If a custom URL was set, the
             * previously defined custom URL will be returned.
             */
            this.getCurrentUrl = function() {
                return configCustomUrl || locationHrefAlias;
            };

            /**
             * Add to array of params that are ignored by form append and session data
             *
             * @param string|array ignoreParams
             */
            this.setIgnoreParams = function(ignoreParams) {
                configIgnoreParams = isString(ignoreParams)
                    ? configIgnoreParams.push(ignoreParams)
                    : configIgnoreParams.concat(ignoreParams);
            };

            /**
             * Returns array of params that are ignored by form append and session data
             */
            this.getIgnoreParams = function() {
                return configIgnoreParams;
            };

            /**
             * Set array of params to be added to querystring for all links and forms
             *
             * @param string|array appendParams
             */
            this.setAppendParams = function(appendParams) {
                configAppendParams = isString(appendParams) ? [appendParams] : appendParams;
            };

            /**
             * Returns array of params to be added to querystring for all links and forms
             */
            this.getAppendParams = function() {
                return configAppendParams;
            };

            /**
             * Add to array of params that are only processed on a landing page
             *
             * @param string|array firstAttributionParams
             */
            this.setFirstAttributionParams = function(firstAttributionParams) {
                configFirstAttributionParams = isString(firstAttributionParams)
                    ? configFirstAttributionParams.push(firstAttributionParams)
                    : configFirstAttributionParams.concat(firstAttributionParams);
            };

            /**
             * Returns array of params that are only processed on a landing page
             */
            this.getFirstAttributionParams = function() {
                return configFirstAttributionParams;
            };

            /**
             * Add to array of params to check which indicate this is an inbound link that is the start of a new campaign
             *
             * @param string|array campaignStartParams
             */
            this.setCampaignStartParams = function(campaignStartParams) {
                configCampaignStartParams = isString(campaignStartParams)
                    ? configCampaignStartParams.push(campaignStartParams)
                    : configCampaignStartParams.concat(campaignStartParams);
            };

            /**
             * Returns array of params to check which indicate this is an inbound link that is the start of a new campaign
             */
            this.getCampaignStartParams = function() {
                return configCampaignStartParams;
            };

            /**
             * Override default session Id parameter used in cross-domain URLs and cookies
             *
             * @param string sessionIdParam
             */
            this.setSessionIdParam = function(sessionIdParam) {
                configSessionIdParam = sessionIdParam;
            };

            /**
             * Set array of classes to be treated as outlinks
             *
             * @param string|array linkClasses
             */
            this.setLinkClasses = function(linkClasses) {
                configLinkClasses = isString(linkClasses) ? [linkClasses] : linkClasses;
            };

            /**
             * Strip hash tag (or anchor) from URL
             * Note: this can be done in the Caliban>Settings>Websites on a per-website basis
             *
             * @deprecated
             * @param bool enableFilter
             */
            this.discardHashTag = function(enableFilter) {
                configDiscardHashTag = enableFilter;
            };

            /**
             * Set session data being tracked externally to local object
             *
             * @param object Session data tracked for current session
             */
            this.setSessionData = function(_sessionData) {
                sessionData = _sessionData;

                Caliban.trigger('sessionSet', [this]);
            };

            /**
             * Returns session data set locally inside tracker
             */
            this.getSessionData = function() {
                return sessionData;
            };

            /**
             * Set additional data key/value pairs
             *
             * @param object data
             */
            this.setSessionExtraData = function(data) {
                sessionExtraData = data;
            };

            /**
             * Return the current extra data object
             */
            this.getSessionExtraData = function() {
                return sessionExtraData;
            };

            /**
             * Set tracker namespace for all form input appends
             *
             * @param string formInputNamespace
             */
            this.setFormInputNamespace = function(formInputNamespace) {
                configFormInputNamespace = formInputNamespace;
            };

            /**
             * Returns tracker namespace used for all form input appends
             */
            this.getFormInputNamespace = function() {
                return configFormInputNamespace;
            };

            /**
             * Set tracker to debug mode
             *
             * @param bool enableDebug
             */
            this.setDebug = function(enableDebug) {
                configDebug = enableDebug;
            };

            /**
             * Returns if tracker is running in debug mode
             */
            this.getDebug = function() {
                return configDebug;
            };

            /**
             * Set first-party cookie domain
             *
             * @param string domain
             */
            this.setCookieDomain = function(domain) {
                var domainFixed = domainFixup(domain);

                if (isPossibleToSetCookieOnDomain(domainFixed)) {
                    configCookieDomain = domainFixed;
                    updateDomainHash();
                }
            };

            /**
             * Get first-party cookie domain
             */
            this.getCookieDomain = function() {
                return configCookieDomain;
            };

            /**
             * Detect if cookies are enabled and supported by browser.
             */
            this.hasCookies = function() {
                return '1' === hasCookies();
            };

            /**
             * Set a first-party cookie for the duration of the session.
             *
             * @param string cookieName
             * @param string cookieValue
             * @param int msToExpire Defaults to session cookie timeout
             */
            this.setSessionCookie = function(cookieName, cookieValue, msToExpire) {
                if (!cookieName) {
                    throw new Error('Missing cookie name');
                }

                if (!isDefined(msToExpire)) {
                    msToExpire = configSessionTimeout;
                }

                configCookiesToDelete.push(cookieName);

                setCookie(cookieName, cookieValue, msToExpire, configCookiePath, configCookieDomain);
            };

            /**
             * Get first-party cookie value.
             *
             * Returns null if cookies are disabled or if no cookie could be found for this name.
             *
             * @param string cookieName
             */
            this.getCookie = function(cookieName) {
                var cookieValue = getCookie(cookieName);

                if (cookieValue === 0) {
                    return null;
                }

                return cookieValue;
            };

            /**
             * Set first-party cookie path.
             *
             * @param string domain
             */
            this.setCookiePath = function(path) {
                configCookiePath = path;
                updateDomainHash();
            };

            /**
             * Get first-party cookie path.
             *
             * @param string domain
             */
            this.getCookiePath = function(path) {
                return configCookiePath;
            };

            /**
             * Set session timeout (in seconds).
             * Defaults to 2 hours (timeout=7200)
             *
             * @param int timeout
             */
            this.setSessionTimeout = function(timeout) {
                configSessionTimeout = timeout * 1000;
            };

            /**
             * Get session timeout (in seconds).
             */
            this.getSessionTimeout = function() {
                return configSessionTimeout;
            };

            /**
             * Enable the Secure cookie flag on all first party cookies.
             * This should be used when your website is only available under HTTPS
             * so that all tracking cookies are always sent over secure connection.
             *
             * @param bool
             */
            this.setSecureCookie = function(enable) {
                configCookieIsSecure = enable;
            };

            /**
             * Disables all cookies from being set
             *
             * Existing cookies will be deleted on the next call to track
             */
            this.disableCookies = function() {
                configCookiesDisabled = true;
                browserFeatures.cookie = '0';

                if (configTrackerPropertyId) {
                    deleteCookies();
                }
            };

            /**
             * One off cookies clearing. Useful to call this when you know for sure a new session is using the same browser,
             * it maybe helps to "reset" tracking cookies to prevent data reuse for different users.
             */
            this.deleteCookies = function() {
                deleteCookies();
            };

            /**
             * Handle do-not-track requests
             *
             * @param bool enable If true, don't track if user agent sends 'do-not-track' header
             */
            this.setDoNotTrack = function(enable) {
                var dnt = navigatorAlias.doNotTrack || navigatorAlias.msDoNotTrack;
                configDoNotTrack = enable && (dnt === 'yes' || dnt === '1');

                // do not track also disables cookies and deletes existing cookies
                if (configDoNotTrack) {
                    this.disableCookies();
                }
            };

            /**
             * Add click listener to a specific link element.
             * When clicked, Caliban will log the click automatically.
             *
             * @param DOMElement element
             * @param bool enable If false, do not use pseudo click-handler (middle click + context menu)
             */
            this.addListener = function(element, enable) {
                addClickListener(element, enable);
            };

            /**
             * Add submit listeners to all non-excluded form elements.
             */
            this.addSubmitListeners = function() {
                addSubmitListeners();
            };

            /**
             * Add all caliban data as hidden form fields to all non-excluded form elements.
             */
            this.addFormData = function() {
                addFormData();
            };

            /**
             * Install link tracker.
             *
             * If you change the DOM of your website or web application you need to make sure to call this method
             * again so Caliban can detect links that were added newly.
             *
             * The default behaviour is to use actual click events. However, some browsers
             * (e.g., Firefox, Opera, and Konqueror) don't generate click events for the middle mouse button.
             *
             * To capture more "clicks", the pseudo click-handler uses mousedown + mouseup events.
             * This is not industry standard and is vulnerable to false positives (e.g., drag events).
             *
             * There is a Safari/Chrome/Webkit bug that prevents tracking requests from being sent
             * by either click handler.  The workaround is to set a target attribute (which can't
             * be "_self", "_top", or "_parent").
             *
             * @see https://bugs.webkit.org/show_bug.cgi?id=54783
             *
             * @param bool enable Defaults to true.
             *                    * If "true", use pseudo click-handler (treat middle click and open contextmenu as
             *                    left click). A right click (or any click that opens the context menu) on a link
             *                    will be tracked as clicked even if "Open in new tab" is not selected.
             *                    * If "false" (default), nothing will be tracked on open context menu or middle click.
             *                    The context menu is usually opened to open a link / download in a new tab
             *                    therefore you can get more accurate results by treat it as a click but it can lead
             *                    to wrong click numbers.
             */
            this.enableLinkTracking = function(enable) {
                linkTrackingEnabled = true;

                var self = this;
                trackCallbackOnReady(function() {
                    addClickListeners(enable, self);
                });
            };

            /**
             * Sends a tracking request with custom request parameters.
             * Caliban will prepend the hostname and path to Caliban, as well as all other needed tracking request
             * parameters prior to sending the request. Useful eg if you track custom dimensions via a plugin.
             *
             * @param request eg. "param=value&param2=value2"
             * @param callback
             */
            this.trackRequest = function(request, callback) {
                var fullRequest = getRequest(request);
                sendRequest(fullRequest, configTrackerPause, callback);
            };

            // Fire tracker setup event
            Caliban.trigger('TrackerSetup', [this]);
        }

        /************************************************************
         * Proxy object
         * - this allows the caller to continue push()'ing to _cbn
         *   after the Tracker has been initialized and loaded
         ************************************************************/
        function TrackerProxy() {
            return {
                push: apply,
            };
        }

        /**
         * Applies the given methods in the given order if they are present in cbn.
         *
         * @param {Array} cbn
         * @param {Array} methodsToApply an array containing method names in the order that they should be applied
         *                 eg ['setPropertyId', 'setTrackerUrl']
         * @returns {Array} the modified cbn array with the methods that were already applied set to undefined
         */
        function applyMethodsInOrder(cbn, methodsToApply) {
            var appliedMethods = {};
            var index, iterator;

            for (index = 0; index < methodsToApply.length; index++) {
                var methodNameToApply = methodsToApply[index];
                appliedMethods[methodNameToApply] = 1;

                for (iterator = 0; iterator < cbn.length; iterator++) {
                    if (cbn[iterator] && cbn[iterator][0]) {
                        var methodName = cbn[iterator][0];

                        if (methodNameToApply === methodName) {
                            apply(cbn[iterator]);
                            delete cbn[iterator];

                            if (appliedMethods[methodName] > 1) {
                                console.warn(
                                    'The method ' +
                                        methodName +
                                        ' is registered more than once in "_cbn" variable. Only the last call has an effect. Please have a look at the multiple Caliban trackers documentation: https://developer.caliban.org/guides/tracking-javascript-guide#multiple-caliban-trackers'
                                );
                            }

                            appliedMethods[methodName]++;
                        }
                    }
                }
            }

            return cbn;
        }

        /************************************************************
         * Constructor
         ************************************************************/

        var applyFirst = [
            'setDebug',
            'setTrackerUrl',
            'enableCrossDomainLinking',
            'setSessionTimeout',
            'setSecureCookie',
            'setCookiePath',
            'setCookieDomain',
            'setDomains',
            'setPropertyId',
            'setUserId',
            'setSessionIdParam',
            'setSessionExtraData',
            'setIgnoreParams',
            'setAppendParams',
            'setIgnoreClasses',
            'setFormInputNamespace',
            'enableLinkTracking',
        ];

        /************************************************************
         * Public data and methods
         ************************************************************/

        Caliban = {
            initialized: false,

            /**
             * Listen to an event and invoke the handler when a the event is triggered.
             *
             * @param string event
             * @param function handler
             */
            on: function(event, handler) {
                if (!eventHandlers[event]) {
                    eventHandlers[event] = [];
                }

                eventHandlers[event].push(handler);
            },

            /**
             * Remove a handler to no longer listen to the event. Must pass the same handler that was used when
             * attaching the event via ".on".
             * @param string event
             * @param function handler
             */
            off: function(event, handler) {
                if (!eventHandlers[event]) {
                    return;
                }

                var i = 0;
                for (i; i < eventHandlers[event].length; i++) {
                    if (eventHandlers[event][i] === handler) {
                        eventHandlers[event].splice(i, 1);
                    }
                }
            },

            /**
             * Triggers the given event and passes the parameters to all handlers.
             *
             * @param string event
             * @param Array extraParameters
             * @param Object context  If given the handler will be executed in this context
             */
            trigger: function(event, extraParameters, context) {
                if (!eventHandlers[event]) {
                    return;
                }

                var i = 0;
                for (i; i < eventHandlers[event].length; i++) {
                    eventHandlers[event][i].apply(context || windowAlias, extraParameters);
                }
            },

            /**
             * Get Tracker (factory method)
             *
             * @param string calibanUrl
             * @param int|string propertyId
             * @return Tracker
             */
            getTracker: function(calibanUrl, propertyId) {
                if (!isDefined(propertyId)) {
                    propertyId = this.getAsyncTracker().getPropertyId();
                }
                if (!isDefined(calibanUrl)) {
                    calibanUrl = this.getAsyncTracker().getTrackerUrl();
                }

                return new Tracker(calibanUrl, propertyId);
            },

            /**
             * Get internal asynchronous tracker object
             *
             * @return Tracker|null
             */
            getAsyncTracker: function() {
                return asyncTracker;
            },

            /**
             * Create internal asynchronous tracker object.
             *
             * If asyncTracker is already set up then return, otherwise create a new one
             *
             * @param string calibanUrl
             * @param int|string propertyId
             * @return Tracker
             */
            createAsyncTracker: function(calibanUrl, propertyId) {
                // Return existing tracker
                if (asyncTracker) {
                    return asyncTracker;

                    // Create new tracker
                } else {
                    asyncTracker = new Tracker(calibanUrl, propertyId);

                    _cbn = applyMethodsInOrder(_cbn, applyFirst);

                    // apply the queue of actions
                    for (iterator = 0; iterator < _cbn.length; iterator++) {
                        if (_cbn[iterator]) {
                            apply(_cbn[iterator]);
                        }
                    }

                    // replace initialization array with proxy object
                    _cbn = new TrackerProxy();

                    Caliban.trigger('TrackerCreated', [asyncTracker]);

                    return asyncTracker;
                }
            },
        };

        // Expose Caliban as an AMD module
        if (typeof define === 'function' && define.amd) {
            define('caliban', [], function() {
                return Caliban;
            });
        }

        return Caliban;
    })();
}

(function() {
    'use strict';

    function hasCalibanConfiguration() {
        if ('object' !== typeof _cbn) {
            return false;
        }
        // needed to write it this way for jslint
        var lengthType = typeof _cbn.length;
        if ('undefined' === lengthType) {
            return false;
        }

        return !!_cbn.length;
    }

    if (!window.Caliban.getAsyncTracker()) {
        // we only create an initial tracker when no other async tracker has been created yet in calibanAsyncInit()
        if (hasCalibanConfiguration()) {
            // we only create an initial tracker if there is a configuration for it via _cbn. Otherwise
            // Caliban.getAsyncTracker() would return an unconfigured tracker
            window.Caliban.createAsyncTracker();
        } else {
            _cbn = {
                push: function(args) {
                    // needed to write it this way for jslint
                    var consoleType = typeof console;
                    if (consoleType !== 'undefined' && console && console.error) {
                        console.error(
                            '_cbn.push() was used but Caliban tracker was not initialized before the caliban.js file was loaded. Make sure to configure the tracker via _cbn.push before loading caliban.js. Alternatively, you can create a tracker via Caliban.createAsyncTracker() manually and then use _cbn.push but it may not fully work as tracker methods may not be executed in the correct order.',
                            args
                        );
                    }
                },
            };
        }
    }

    window.Caliban.trigger('CalibanInitialized', []);
    window.Caliban.initialized = true;
})();
