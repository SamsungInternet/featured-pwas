/* eslint-env es6 */
'use strict';

const getWebAppData = require('./get-web-app-data');

Error.stackTraceLimit = Infinity;
const express = require('express');
const exphbs = require('express-handlebars');
const helmet = require('helmet');
const csp = require('helmet-csp');
const color = require('color');

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
			return color(options.fn(this)).light() ? 'black' : 'white';
		}
	}
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use('/static', express.static(__dirname + '/static', {
	maxAge: 3600 * 1000 * 24
}));

app.get('/', function(req, res) {
	res.render('index', {
		items: [{
			description: 'Listen to podcasts with the Podle Web App.',
			name: 'Podle',
			icons: {
				src: 'https://podle.audio/static/icon512.png',
				sizes: 512,
				type: 'image/png'
			},
			background_color: 'white',
			theme_color: '#4E3F30',
			"url": 'https://podle.audio/'
		}, {
			"description": "An Air horn. Probably the best air horn web app there is.",
			"name": "The Air Horner",
			"icons": {
				"src": "https://airhorner.com/images/touch/Airhorner_512.png",
				"type": "image/png",
				"sizes": 512
			},
			"background_color": "#2196F3",
			"theme_color": "#2196F3",
			"url": 'https://airhorner.com/'
		}, {
			"description": "Speed through ruined tracks in the ocean.",
			"name": "A-Frame Racer",
			"icons": {
				"src": "https://samsunginternet.github.io/a-frame-demos/racer/icon192.png",
				"sizes": 512
			},
			"background_color": "white",
			"theme_color": "#8953D8",
			"url": "https://samsunginternet.github.io/a-frame-demos/racer/"
		}]
	});
});

app.get('/get-app-data', function(req, res) {
	if (!req.query.url) {
		res.status(500);
		res.end('No url param!');
		return;
	}
	getWebAppData(req.query.url)
		.then(data => {
			res.json(data);
		})
		.catch(e => {
			res.status(500);
			res.end(e.message);
			console.log(e);
		});
});

app.listen(3000);
console.log('Listening on', 3000);