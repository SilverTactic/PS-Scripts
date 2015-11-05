var Ladders;
try {
	Ladders = require('../ladders.js');
} catch (err) {
	Ladders = require('./ladders.js');
}
var tourLadder = Ladders('tournaments');
var confirm = false;

function display (message, self) {
	if (self.broadcasting) return self.sendReplyBox(message);
	return self.popupReply('|html|' + message);
}

Tournaments.Tournament.prototype.onBattleWin = function (room, winner) {
	var from = Users.get(room.p1);
	var to = Users.get(room.p2);
	var tourSize = this.generator.getUsers().length;

	var result = 'draw';
	if (from === winner) {
		result = 'win';
		if (this.room.isOfficial && tourSize >= 4 && room.battle.endType !== 'forced') tourLadder.updateRating(from.name, to.name, 1, room);
	} else if (to === winner) {
		result = 'loss';
		if (this.room.isOfficial && tourSize >= 4 && room.battle.endType !== 'forced') tourLadder.updateRating(from.name, to.name, 0, room);
	}

	if (result === 'draw' && !this.generator.isDrawingSupported) {
		this.room.add('|tournament|battleend|' + from.name + '|' + to.name + '|' + result + '|' + room.battle.score.join(',') + '|fail');

		this.generator.setUserBusy(from, false);
		this.generator.setUserBusy(to, false);
		this.inProgressMatches.set(from, null);

		this.isBracketInvalidated = true;
		this.isAvailableMatchesInvalidated = true;

		this.runAutoDisqualify();
		this.update();
		return this.room.update();
	}

	var error = this.generator.setMatchResult([from, to], result, room.battle.score);
	if (error) {
		return this.room.add("Unexpected " + error + " from setMatchResult([" + from.userid + ", " + to.userid + "], " + result + ", " + room.battle.score + ") in onBattleWin(" + room.id + ", " + winner.userid + "). Please report this to an admin.").update();
	}

	this.room.add('|tournament|battleend|' + from.name + '|' + to.name + '|' + result + '|' + room.battle.score.join(','));

	this.generator.setUserBusy(from, false);
	this.generator.setUserBusy(to, false);
	this.inProgressMatches.set(from, null);

	this.isBracketInvalidated = true;
	this.isAvailableMatchesInvalidated = true;

	if (this.generator.isTournamentEnded()) {
		this.onTournamentEnd();
	} else {
		this.runAutoDisqualify();
		this.update();
	}
	this.room.update();
};

exports.commands = {
	tourelo: 'tourladder',
	tourladder: function (target, room, user) {
		if (!this.canBroadcast()) return;
		var self = this;
		if (!target || !target.trim()) {
			tourLadder.load().then(function (users) {
				if (!users.length) return self.sendReplyBox('No rated tournaments have been played yet.');
				users.sort(function (a, b) {
					return b[1] - a[1];
				});
				var padding = self.broadcasting ? '5' : '8';
				var table = '<center><b><u>Tournament Ladder</u></b><br>' +
					'<table border = "1" cellspacing = "0" cellpadding = "' + padding + '"><tr><th>No.</th><th>User</th><th>Elo</th>';
				for (var i = 0; i < (self.broadcasting ? 10 : users.length); i++) {
					if (!users[i] || users[i][1] <= 1000) break;
					var user = (Users.getExact(users[i][0]) ? Users.getExact(users[i][0]).name : users[i][0]);
					table += '<tr><td><center>' + (i + 1) + '</center></td><td style = "text-align: center">' + user + '</td><td style = "text-align: center">' + Math.round(users[i][1]) + '</td></tr>';
				}
				table += '</table></center>';
				if (self.broadcasting && users.length > 10) table += '<center><button name = "send" value = "/tourladder"><small>Click to see the full ladder</small></button></center>';

				display(table + '</table>', self);
				if (self.broadcasting) room.update();
			});
			return;
		}

		target = (Users.getExact(target) ? Users.getExact(target).name : target);
		if (tourLadder.indexOfUser(target) === -1) return this.sendReplyBox(target + ' hasn\'t played any rated tournaments yet.');
		tourLadder.load().then(function (users) {
			var elo = users[tourLadder.indexOfUser(target)][1];
			self.sendReplyBox(target + '\'s Tournament Elo is <b>' + Math.round(elo) + '</b>.');
		});
	},

	deletetourladder: 'resettourladder',
	resettourladder: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		tourLadder.load().then(function (users) {
			if (!users.length) return this.sendReply('No rated tournaments have been played yet.');
			if (!confirm) {
				confirm = true;
				return this.sendReply('WARNING: This will permanently delete all tournament ladder ratings. If you\'re sure you want to do this, use this command again.');
			}
			require('fs').unlinkSync('config/ladders/tournaments.tsv');
			delete Ladders.ladderCaches['tournaments'];
			Rooms('lobby').add('|html|<b>The Tournament Ladder has been reset.</b>');
			Rooms('lobby').update();
			if (room.id !== 'lobby') this.sendReply('The Tournament Ladder has been reset.');
		}.bind(this));
	}
}