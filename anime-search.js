//Anime search by SilverTactic (Siiilver)
//This script searches for an anime/anime series based on a given query and displays results.
//it uses the anime database of hummingbird.me btw
"use strict";

const fs = require('fs');
const request = require('request');

const FILE_NAME = "config/animeCache.json";
let animeCache;
try {
	animeCache = JSON.parse(fs.readFileSync(FILE_NAME));
} catch (err) {
	fs.writeFileSync(FILE_NAME, JSON.stringify({
		queries: {},
		results: {}
	}));
	animeCache = JSON.parse(fs.readFileSync(FILE_NAME));
}

function search(query) {
	return new Promise(function (resolve, reject) {
			let formattedQuery = query.toLowerCase().replace(/ /g, '');
			if (animeCache.queries[formattedQuery]) return resolve(animeCache.queries[formattedQuery]);
			let link = 'https://hummingbird.me/search.json?query=' + query;
			request(link, function (err, response, data) {
				if (err || response.statusCode !== 200) return reject('Anime results for "' + query + '" were not found...');
				data = JSON.parse(data);
				//displays exact match if found, displays first match otherwise
				let firstMatch, exactMatch;
				for (let i in data.search) {
					let info = data.search[i];
					if (info.type === 'anime') {
						if (info.link === formattedQuery || toId(info.title) === formattedQuery) {
							exactMatch = i;
							break;
						}
						if (!firstMatch) firstMatch = i;
					}
				}
				if (!firstMatch && !exactMatch) return reject('Anime results for "' + query + '" were not found...');
				let info = data.search[exactMatch || firstMatch];
				animeCache.queries[formattedQuery] = info.link;
				fs.writeFileSync(FILE_NAME, JSON.stringify(animeCache, null, 1));
				return resolve(info.link);

			})
		})
		.then(function (name) {
			return new Promise(function (resolve, reject) {
				if (animeCache.results[name]) return resolve(animeCache.results[name]);
				let url = 'http://hummingbird.me/api/v1/anime/' + name;
				request(url, function (err, response, data) {
					data = JSON.parse(data);
					let info = '<div style = "min-height: 250px">' +
						'<div style = "float: left; height: 250px; margin-right: 2px;"><img src = "' + data.cover_image + '" style = "max-height: 250px;"></div>' +
						'<div style = "padding: 2px">' +
						'<b style = "font-size: 11pt">' + data.title + '</b><br>' +
						'<b>Status: </b>' + data.status + '<br>' +
						(data.show_type !== 'TV' ? '<b>Show Type: </b>' + data.show_type + '<br>' : '') +
						(data.episode_count ? '<b>Episode Count: </b>' + data.episode_count + '<br>' : '') +
						(data.episode_length ? '<b>Episode Duration: </b>' + data.episode_length + ' minutes<br>' : '') +
						'<b>Air Date: </b>' + data.started_airing + '<br>' +
						'<b>Rating: </b>' + (data.community_rating ? Math.round(data.community_rating * 100) / 100 + ' on 5' : 'N/A') + '<br>' +
						'<b>Genre(s): </b>' + data.genres.map(function (genre) { return genre.name; }).join(', ') + '<br>' +
						'<details>' +
							'<summary><b>Synopsis</b> (Click to view)</summary>' +
							data.synopsis.split('\n')[0] +
						'</details></div></div>';
					animeCache.results[name] = info;
					fs.writeFileSync(FILE_NAME, JSON.stringify(animeCache, null, 1));
					resolve(info);
				});
			});
		})
		.catch(function (err) {
			return Promise.resolve(err);
		});
}

exports.commands = {
	animesearch: 'anime',
	as: 'anime',
	anime: function (target, room, user, connection, cmd) {
		if (!this.canBroadcast()) return;
		if (this.broadcasting && room.id === 'lobby') return this.errorReply("This command cannot be broadcasted in the lobby.");
		if (!target || !target.trim()) return this.sendReply('/' + cmd + ' [query] - Searches for an anime or anime series based on the given search query.');

		let query = target.trim();
		if (query.length > 75) return this.errorReply("The given query is too long.");

		search(query).then(function (response) {
			this.sendReplyBox(response);
			if (this.broadcasting) room.update();
		}.bind(this));
	}
}