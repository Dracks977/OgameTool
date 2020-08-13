const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Sentry = require('@sentry/electron');

const Alert = require("electron-alert");
const FleetWatch = require("./src/fleetWatch")


const store = require('./src/store');

Sentry.init({dsn: 'https://92a9e7a8d8114dc79b0bc6f27ed0ba08@o433756.ingest.sentry.io/5389597'});

const debug = require('electron-debug');
//debug()
FleetWatch.init(BrowserWindow, Alert, store)
let started = false




function createWindow () {
	const iconPath = path.join(__dirname, 'static', 'icon.png');

  // Cree la fenetre du navigateur.
  let win = new BrowserWindow({
  	width: 900,
  	height: 700,
  	webPreferences: {
  		nodeIntegration: true
  	},
  	title: "OGame Alert",
  	icon: iconPath
  });

  // and load the index.html of the app.
  win.loadFile(path.join(__dirname, 'views', 'index.html'));
  win.webContents.on('did-finish-load', _ => {
  	win.webContents.send('fillfromstore', store.get('user'))
  })

  ipcMain.on('config', (event, data) => {
  	store.set('user', data);
  	win.hide();
  	Alert.fireToast({
  		position: "bottom-end",
  		title: "Config save",
  		type: "info",
  		showConfirmButton: false,
  		timer: 3000
  	});
  })

  
  win.tray = new Tray(nativeImage.createFromPath(iconPath));
  win.removeMenu()
  win.on('minimize',function(event){
  	event.preventDefault();
  	win.hide();
  });

  win.on('close', function (event) {
  	if(!app.isQuiting){
  		event.preventDefault();
  		win.hide();
  	}

  	return false;
  });

  let contextMenu = Menu.buildFromTemplate([
  	{ label: 'Config', click:  function(){
  		win.show();
  	} },
  	{ label: 'Start Alert Watch', click:  function(){
  		if (!started) {
  			FleetWatch.start();
  			started = true
  		} else {
  			Alert.fireToast({
  				position: "bottom-end",
  				title: "Alert Watch already start",
  				type: "warning",
  				showConfirmButton: false,
  				timer: 3000
  			});
  		}
  	} },
  	{ label: 'Stop Alert Watch', click:  function(){
  		if (started) {
  			FleetWatch.stop();
  			started = true
  		} else {
  			Alert.fireToast({
  				position: "bottom-end",
  				title: "Alert Watch not start",
  				type: "warning",
  				showConfirmButton: false,
  				timer: 3000
  			});
  		}
  	} },
  	{ label: 'Quit', click:  function(){
  		app.isQuiting = true;
  		app.quit();
  	} }
  	]);

  win.tray.setContextMenu(contextMenu);

}

app.whenReady().then(function() {
	createWindow()
	process.on(
		"uncaughtException",
		Alert.uncaughtException(false, err => {
			console.error("Uncaught Exception:", err);
			app.exit(1);
		}, true, true)
		);
});



