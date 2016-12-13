/* eslint-env es6 */
'use strict';

const getWebAppData = require('./get-web-app-data');

Error.stackTraceLimit = Infinity;
const express = require('express');
const exphbs = require('express-handlebars');
const helmet = require('helmet');
const csp = require('helmet-csp');
const color = require('color');
const bluebird = require('bluebird');
const redis = require('redis');

const REDIS_INDEX_KEY = "INDEX_V4";
const REDIS_ENTRY_NAMESPACE = "ENTRY_V4_";

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient({
	url: process.env.REDIS_URL
});

const app = express();

app.set('json spaces', 2);
app.use(helmet());
app.use(csp({
	// Specify directives as normal.
	directives: {
		defaultSrc: ['\'self\'', 'http:', 'https:'],
		scriptSrc: ['\'self\'', 'cdn.polyfill.io', 'platform.twitter.com', 'https://ssl.google-analytics.com/ga.js'],
		styleSrc: ['\'self\'', 'fonts.googleapis.com', '\'unsafe-inline\''],
		fontSrc: ['\'self\'', 'fonts.gstatic.com'],
		imgSrc: ['\'self\'', 'data:', 'https:'],
		// reportUri: '/api/report-violation',
		frameAncestors: ['none'],

		objectSrc: [], // An empty array allows nothing through
	},

	// Set to true if you want to set all headers: Content-Security-Policy,
	// X-WebKit-CSP, and X-Content-Security-Policy.
	setAllHeaders: true,

	// Set to true if you want to disable CSP on Android where it can be buggy.
	disableAndroid: false,

	// Set to false if you want to disable any user-agent sniffing.
	// This may make the headers less compatible but it will be much faster.
	// This defaults to `true`. Should be false if behind cdn.
	browserSniff: false
}));

// Use Handlebars for templating
const hbs = exphbs.create({
	helpers: {
		ifEq: function(a, b, options) {
			return (a === b) ? options.fn(this) : options.inverse(this);
		},
		mangle: function(options) {
			return options.fn(this).replace(/[^a-z0-9]+/ig, '-');
		},
		bytesToMegabytes: function(options) {
			return (Number(options.fn(this)) / (1024 * 1024)).toFixed(2) + 'MB';
		},
		encodeURIComponent: function(options) {
			return encodeURIComponent(options.fn(this));
		},
		fontColor: function(options) {
			return color(options.fn(this) || '#ffffff').light() ? 'black' : 'white';
		}
	}
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use('/static', express.static(__dirname + '/static', {
	maxAge: 3600 * 1000 * 24
}));

app.use('/sw-toolbox', express.static(__dirname + '/node_modules/sw-toolbox/', {
	maxAge: 3600 * 1000 * 24
}));

app.use('/sw.js', express.static(__dirname + '/static/scripts/sw.js', {
	maxAge: 0
}));

app.get('/', function (req, res) {
	client.smembersAsync(REDIS_INDEX_KEY).then(data => {
		const toFetch = data.map(a => client.getAsync(a));
		return Promise.all(toFetch)
			.then(items => items.map(j => JSON.parse(j)))
			.then(items => items.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10))
			.then(items => res.render('index', { items }));
	});
});

app.get('/save/', function (req, res) {
	if (!req.query.url) {
		res.status(500);
		res.end('No url param!');
		return;
	}
	if (!req.query.url) {
		res.status(500);
		res.end('No category param!');
		return;
	}
	getWebAppData(req.query.url)
		.then(data => {
			data.category = (req.query.category && (req.query.category.constructor === Array ? req.query.category : [req.query.category])) || ['uncategorised'];
			data.timestamp = Date.now();
			const key = REDIS_ENTRY_NAMESPACE + req.query.url;
			return client.setAsync(key, JSON.stringify(data))
				.then(() => client.expireAsync(key, 3600 * 24 * 30))
				.then(() => client.saddAsync(REDIS_INDEX_KEY, key))
				.then(() => client.scardAsync(REDIS_INDEX_KEY).then(no => console.log(no)))
				.then(() => res.redirect('/'));
		})
		.catch(e => {
			res.status(500);
			res.end(e.message);
			console.log(e);
		});
})

app.get('/get-app-data', function(req, res) {
	if (!req.query.url) {
		res.status(500);
		res.end('No url param!');
		return;
	}
	getWebAppData(req.query.url)
		.then(data => {
			res.render('index', {
				items: [data],
				confirm: true,
				url: req.query.url
			});
		})
		.catch(e => {
			res.status(500);
			res.end(e.message);
			console.log(e);
		});
});

app.listen(process.env.PORT || 3000);
console.log('Listening on', process.env.PORT || 3000);