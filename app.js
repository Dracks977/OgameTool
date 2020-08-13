const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Sentry = require('@sentry/electron');
const puppeteer = require('puppeteer-extra')
const Alert = require("electron-alert");
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

Sentry.init({dsn: 'https://92a9e7a8d8114dc79b0bc6f27ed0ba08@o433756.ingest.sentry.io/5389597'});


let login = 'eclat.nathan@gmail.com'
let password = 'pommedu77'
let planets
let alreadysend = []
let started = false

function createWindow () {
	const iconPath = path.join(process.resourcesPath, 'icon.png');

  // Cree la fenetre du navigateur.
  let win = new BrowserWindow({
  	width: 800,
  	height: 600,
  	webPreferences: {
  		nodeIntegration: true
  	},
  	title: "OGame Alert",
  	icon: 'resources/icon.png'
  });

  // and load the index.html of the app.
  win.loadFile('index.html');


  
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
  	{ label: 'Start', click:  function(){
  		if (!started) {
  			launchMove();
  			started = true
  		} else {
  			Alert.fireToast({
  				position: "bottom-end",
  				title: "Already runing",
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



// fleetwatch
function launchMove() {
	puppeteer.launch({ headless: true, executablePath: getChromiumExecPath() }).then(async browser => {
		Alert.fireToast({
			position: "bottom-end",
			title: "Alert set",
			type: "success",
			showConfirmButton: false,
			timer: 3000
		});
		console.log('Running tests..')
		let page = await browser.newPage()
		await page.goto('https://lobby.ogame.gameforge.com/')
		page = await loginfct(page, browser)
		await page.waitFor(rdm(6000))
		await getAllPlanette(page)
		console.log(planets)
		await MoveChecker(page)
		await mainboucle(page, browser)

	})
}



async function getNewPageWhenLoaded (browser) {
	return new Promise(x =>
		browser.on('targetcreated', async target => {
			if (target.type() === 'page') {
				const newPage = await target.page();
				const newPagePromise = new Promise(y =>
					newPage.once('domcontentloaded', () => y(newPage))
					);
				const isPageLoaded = await newPage.evaluate(
					() => document.readyState
					);
				return isPageLoaded.match('complete|interactive')
				? x(newPage)
				: x(newPagePromise);
			}
		})
		);
};

async function cleanotherpage(url, browser) {
	pages = await browser.pages()
	for (const page of pages) {
		if (page.url() !== url)
			page.close()
	}
}

async function loginfct(page, browser) {
	await page.waitFor(rdm(5000))
	await page.click('#loginRegisterTabs ul.tabsList li')
	await page.waitFor(200)
	await page.focus('[name = "email"]')
	await page.keyboard.type(login)
	await page.focus('[name = "password"]')
	await page.keyboard.type(password)
	await page.click('#loginRegisterTabs .button.button-lg')
	await page.waitFor(rdm(5000))
	await page.click('#joinGame .button.button-default')
	page = await getNewPageWhenLoaded(browser)
	await page.waitFor(rdm(2000))
	cleanotherpage(page.url(), browser)
	return page
}

async function checkco(page, browser) {
	await page.waitFor(rdm(5000))
	if (page.url() == "https://lobby.ogame.gameforge.com/fr_FR/hub") {
		await page.click('#joinGame .button.button-default')
		page = await getNewPageWhenLoaded(browser)
		await page.waitFor(rdm(2000))
		cleanotherpage(page.url(), browser)
		await page.waitFor(rdm(5000))
	}
	return page
}

async function getAllPlanette (page) {
	planets = await page.evaluate(() => {
		let arr = []
		$(".planet-koords").each( function () {
			arr.push(this.innerText)
		})
		return arr;
	})
}

async function MoveChecker (page) {
	if (await isLocatorReady(await page.$('#eventboxFilled'), page))
		await page.click('#eventboxFilled')
	await page.waitFor(rdm(500))
	if (await page.$('.eventFleet') !== null) {
		console.log('mouvement de flotte détecté');
		const data = await page.evaluate(() => {
			let array = []
			$('.eventFleet').each(function() {
				let obj = {
					dest : this.children[8].innerText
				};
				$.each(this.attributes, function() {
					obj[this.name] = this.value
				})
				array.push(obj)
			})
			return array
		})
		//console.log(data)
		for (let move of data) {
			if (move["data-mission-type"] === '1' && planets.includes(move.dest)) {
				console.log("attaque détécté !")

				let win2 = new BrowserWindow({
					width: 200,
					height: 200,
					show: false
				})

				win2.loadFile('index2.html')

				Alert.fireToast({
  				position: "bottom-end",
  				title: "Attack incoming",
  				type: "warning",
  				showConfirmButton: false,
  				timer: 3000
  			});

				sleep(15000).then(() => { win2.close() });
			}
		}
	} 
	else {
		console.log('pas de move de flotte')
	} 
}

async function mainboucle(page, browser) {
	try {
		page = await checkco(page, browser)
		const example = await page.$$('div#planetList div');
		let waittime = waiting()
		console.log('next check in : ' + waittime)
		await page.waitFor(waittime)
		await example[Math.floor((Math.random() * example.length - 1))].click()
		page = await checkco(page, browser)
		await getAllPlanette(page)
		await MoveChecker(page)
		mainboucle(page,browser)
	} catch (e) {
		page = await checkco(page, browser)
		mainboucle(page,browser)
	}



}

async function isLocatorReady(element, page) {
	const isVisibleHandle = await page.evaluateHandle((e) => 
	{
		const style = window.getComputedStyle(e);
		return (style && style.display !== 'none' && 
			style.visibility !== 'hidden' && style.opacity !== '0');
	}, element);
	var visible = await isVisibleHandle.jsonValue();
	const box = await element.boxModel();
	if (visible && box) {
		return true;
	}
	return false;
}

function rdm(int) {
	return int + Math.floor(Math.random() * (2000 + 1));
}

function waiting() {
	return 360000 + Math.floor(Math.random() * (360000 + 1))
}

function getChromiumExecPath() {
	return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}