//Poof by SilverTactic (Siiilver)
//These poofs support HTML, so go nuts :3
const FILE_NAME = 'config/poofs.json';

var fs = require('fs');
var poofoff = false;
var poofs;
try {
	poofs = JSON.parse(fs.readFileSync(FILE_NAME));
} catch (e) {
	var list = ['used Explosion!', 'is blasting off again!', 'peered through the hole on Shedinja\'s back!', 'was smitten by Siiilver\'s mighty sword!', 
		'leaves the server', 'forgot to pray to Lord Helix and is now paying the price!', 'was attacked by the closet monster!',
		'vanished instantly!', 'used Final Gambit and missed!', 'A large spider descended from the sky and picked up (user)!', 'likes trains :D'
	].map(function (msg) {
		if (!msg.match(/\(user\)/)) return '(user) ' + msg;
	});
	fs.writeFileSync(FILE_NAME, JSON.stringify(list, null, 1));
	poofs = JSON.parse(fs.readFileSync(FILE_NAME));
}
function randomColor () {
	var colors = ['9900f2', '4ca2ff', '4cff55', 'e87f00', 'd30007', '8e8080', 'd8b00d', '01776a', '0c4787', '0c870e', '8e892c',
		'5b5931', '660c60', '9e5a99', 'c43873', '39bf39', '7c5cd6', '76d65c', '38c9c9', '2300af', '1daf00'
	];
	return colors[Math.floor(Math.random() * colors.length)];
}

exports.commands = {
	poofhelp: function (target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('-/poof - Leaves a random message in the chat and disconnects the user from the server.<br>' +
			'-/cpoof <em>Message</em> - Leaves a custom message in the chat and disconnects the user from the server. Requires %, @, # or ~<br>' +
			'-/addpoof <em>Message</em> - Adds a poof message into the list of possible poofs. Adding "(user)" into a poof message replaces "(user)" with that user\'s name. Requires ~<br>' +
			'-/pooflist - Displays the list of all poof messages.'
		);
	},

	d: 'poof',
	poof: function (target, room, user) {
		if (!this.canTalk()) return;
		if (poofoff) return this.sendReply("Poofs are currently disabled.");
		var message = poofs[Math.floor(Math.random() * poofs.length)].replace(/\(user\)/g, Tools.escapeHTML(user.name));
		this.add('|html|<center><span style = "color:#' + randomColor() + '"><b>~~ ' + message + ' ~~</b></span></center>');
		user.disconnectAll();
	},

	custompoof: 'cpoof',
	cpoof: function (target, room, user) {
		if (!this.canTalk()) return;
		if (poofoff) return this.sendReply("Poofs are currently disabled.");
		if (!target || !target.trim()) return this.parse('/poof');
		if (!target.match(/\(user\)/)) target = Tools.escapeHTML(user.name) + ' ' + target;
		else target = target.replace(/\(user\)/g, Tools.escapeHTML(user.name));
		this.add('|html|<center><span style = "color:#' + randomColor() + '"><b>~~ ' + target.trim() + ' ~~</b></span></center>');
		this.disconnectAll();
	},

	addpoof: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		if (!target) return this.parse('/poofhelp');
		if (poofs.map(toId).indexOf(toId(target)) > -1) return this.sendReply('That poof message already exists!');
		if (target.length > 100) return this.sendReply('Poof messages can only contain a maximum of 100 characters.');
		if (!target.match(/\(user\)/)) target = '(user) ' + target;
		poofs.push(target.trim());
		fs.writeFileSync(FILE_NAME, JSON.stringify(poofs, null, 1));
		return this.sendReply('|html|"' + target + '" has been added to the list of poof messages.');
	},

	switchpoof: 'togglepoof',
	tpoof: 'togglepoof',
	togglepoof: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		poofoff = !poofoff;
		this.sendReply('Poofs have been ' + (poofoff ? 'disabled' : 'enabled') + '.');
	},

	pooflist: function (target, room, user) {
		var list = '|html|<center><b>Poof message list</b></center><br>';
		poofs.forEach(function (msg) {
			list += '"' + msg + '"';
			if (user.can('hotpatch')) list += '<button name = "send" value = "/deletepoof ' + msg + '" style = "font-size: 7pt;">Delete</button>';
			list += '<br>';
		});
		this.popupReply(list);
	},

	deletepoof: function (target, room, user) {
		if (!target || !target.trim()) return this.sendReply('|html|/deletepoof <em>Message</em> - Deletes the selected message from the list of poofs.');
		if (!target.match(/\(user\)/)) target = '(user) ' + target;
		var pos = poofs.map(toId).indexOf(toId(target));
		if (pos === -1) return this.sendReply('That poof message doesn\'t exist.');
		this.popupReply('|html|The poof message "' + poofs[pos] + '" has been deleted.');
		poofs.splice(pos, 1);
		fs.writeFileSync(FILE_NAME, JSON.stringify(poofs, null, 1));
	}
};