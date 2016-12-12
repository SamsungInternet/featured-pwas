'use strict';
/* Simple service worker using sw-toolbox */
/* global toolbox, importScripts */

importScripts('/sw-toolbox/sw-toolbox.js'); // Update path to match your own setup

toolbox.router.get('/static/', toolbox.fastest);

toolbox.router.get('/', toolbox.networkFirst, {
	networkTimeoutSeconds: 2
});
