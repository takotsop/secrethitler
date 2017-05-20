let passport = require('passport'), // eslint-disable-line no-unused-vars
	Account = require('../models/account'), // eslint-disable-line no-unused-vars
	{ getProfile } = require('../models/profile/utils'),
	Game = require('../models/game'),
	moment = require('moment'),
	_ = require('lodash'),
	socketRoutes = require('./socket/routes'),
	accounts = require('./accounts'),
	ensureAuthenticated = (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}

		res.redirect('/observe');
	};

module.exports = () => {
	let gamesData;
	const getData = () => {
		Game.find({})
			.then(data => {
				const completedGames = (() => {
						const dates = data.map(game => moment(new Date(game.date)).format('l')).filter(date => date !== '5/13/2017'),  // no idea what happened on that date but the db is messed up and shows 3x more than usual which can't be right.
							labels = _.uniq(dates),
							series = new Array(labels.length).fill(0);

						dates.forEach(date => {
							series[labels.indexOf(date)]++;
						});
						return {
							labels,
							series
						};
					})(),
					getDataOnGameByPlayerCount = (count) => {
						const games = data.filter(game => game.losingPlayers.length + game.winningPlayers.length === count),
							fascistWinCount = games.filter(game => game.winningTeam === 'fascist').length,
							totalGameCount = games.length;
						// console.log(games);
						return {
							fascistWinCount,
							totalGameCount,
							expectedFascistWinCount: (() => {
								if (games.length) {
									return games[games.length - 1].losingPlayers.length / games[games.length - 1].playerCount;
								}
							})()
						};
					};
//  { 
        //     _id: '591b7091fe5420358baab297', 
        //     uid: 'devgame', 
        //     date: '2017-05-13T21:35:13.446Z', 
        //     winningTeam: 'fascist', 
        //     playerCount: 5, 
        //     __v: 0, 
        //     chats: [{ 
        //       timestamp: '2017-05-16T21:33:06.282Z', 
        //       chat: [], 
        //       userName: 'Thrall'} 
        //     ], 
        //     losingPlayers: [ 
        //       {userName: 'Malfurian', team: 'liberal', role: 'liberal'}, 
        //       {userName: 'Uther', team: 'liberal', role: 'liberal'}, 
        //       {userName: 'Rexxar', team: 'liberal', role: 'liberal'} 
        //     ], 
        //     winningPlayers: [ 
        //       {userName: 'Thrall', team: 'fascist', role: 'fascist'}, 
        //       {userName: 'Jaina', team: 'fascist', role: 'hitler'} 
// +
        //     ] 
        //   }
				gamesData = {
					completedGames,
					fivePlayerGameData: getDataOnGameByPlayerCount(5),
					sixPlayerGameData: getDataOnGameByPlayerCount(6),
					sevenPlayerGameData: getDataOnGameByPlayerCount(7),
					eightPlayerGameData: getDataOnGameByPlayerCount(8),
					ninePlayerGameData: getDataOnGameByPlayerCount(9),
					tenPlayerGameData: getDataOnGameByPlayerCount(10)
				};
			});
	};

	accounts();
	socketRoutes();
	getData();
	setInterval(getData, 3600000);

	const renderPage = (req, res, pageName, varName) => {
		const renderObj = {};

		renderObj[varName] = true;

		if (req.user) {
			renderObj.username = req.user.username;
		}

		res.render(pageName, renderObj);
	};

	app.get('/', (req, res) => {
		renderPage(req, res, 'page-home', 'home');
	});

	app.get('/rules', (req, res) => {
		renderPage(req, res, 'page-rules', 'rules');
	});

	app.get('/how-to-play', (req, res) => {
		renderPage(req, res, 'page-howtoplay', 'howtoplay');
	});

	app.get('/stats', (req, res) => {
		renderPage(req, res, 'page-stats', 'stats');
	});

	app.get('/about', (req, res) => {
		renderPage(req, res, 'page-about', 'about');
	});

	app.get('/game', ensureAuthenticated, (req, res) => {
		res.render('game', {
			user: req.user.username,
			game: true,
			isLight: req.user.gameSettings.enableLightTheme
		});
	});

	app.get('/observe', (req, res) => {
		if (req.user) {
			req.session.destroy();
			req.logout();
		}
		res.render('game', {game: true});
	});

	app.get('/profile', (req, res) => {
		const username = req.query.username;

		getProfile(username).then(profile => {
			if (!profile) res.status(404).send('Profile not found');
			else res.json(profile);
		});
	});

	app.get('/data', (req, res) => {
		res.json(gamesData);
	});
};