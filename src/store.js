const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		user: {
			email: 'email',
			password: 'password',
			soundnotif: true,
			mailnotif: false,
			silentMode: true
		}
	}
});
