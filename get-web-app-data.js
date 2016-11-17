/* eslint-env es6 */
/* eslint no-console: 0 */
'use strict';
const promisify = require('es6-promisify');
const env = promisify(require('jsdom').env);
const fetch = require('node-fetch');

function isOk(response) {
	if (!response.ok) {
		throw Error('Bad Response. ' + response.status + ': ' + response.statusMessage);
	}
	return response;
}

function buildWidget(manifest, pageData) {
	const icons = pageData.icons.map(i => ({
		src: i.href,
		sizes: pageData.icons[0].getAttribute('sizes')
	})) || [];
	manifest.icons = manifest.icons.concat(icons);
	manifest.icons.forEach(i => i.sizes = parseInt(i.sizes));
	const output = {};
	output.description = pageData.description;
	output.name = manifest.name || manifest.shortname || pageData.title;
	output.icons = manifest.icons.reduce((a,b) => a.sizes > b.sizes ? a : b);
	output.background_color = manifest.background_color;
	output.theme_color = manifest.theme_color || pageData.theme_color;
	return output;
}

function getWebAppData(url) {
	console.log('fetching', url);
	return env(url, [])
		.then(window => {
			const output = {};
			output.icons = Array.from(window.document.querySelectorAll('link[rel="icon"]'));

			const title = window.document.querySelector('title');
			if (title) {
				output.title = title.textContent;
			}

			const description = window.document.querySelector('meta[name="description"]');
			if (description) {
				output.description = description.content;
			}

			const theme_color = window.document.querySelector('meta[name="theme-color"]');
			if (theme_color) {
				output.theme_color = theme_color.content;
			}

			const manifest = window.window.document.querySelector('link[rel="manifest"]');
			if (manifest) {
				return fetch(manifest.href)
					.then(isOk)
					.then(response => response.json())
					.then(json => buildWidget(json, output));
			}
			throw Error('No manifest file');
		});
}

module.exports = getWebAppData;