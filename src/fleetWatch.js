/* global $ */
const puppeteer = require('puppeteer-extra');
// Add stealth plugin and use defaults (all evasion techniques)
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(stealthPlugin());
const mail = require('./mail');

// Global
let planets;
const alreadysend = [];
let stop = false;

// Import var
let BrowserWindow;
let Alert;
let store;
let path;

module.exports = {
	init: (_BrowserWindow, _Alert, _store, _path) => {
		BrowserWindow = _BrowserWindow;
		Alert = _Alert;
		store = _store;
		path = _path;
	},
	stop: _ => {
		stop = true;
		Alert.fireToast({
			position: 'bottom-end',
			title: 'Alert Watch stop on next check',
			type: 'success',
			showConfirmButton: false,
			timer: 3000
		});
	},
	start: () => {
		stop = false;
		puppeteer.launch({headless: store.get('user.silentMode'), executablePath: getChromiumExecPath()}).then(async browser => {
			Alert.fireToast({
				position: 'bottom-end',
				title: 'Alert Watch starting...',
				type: 'success',
				showConfirmButton: false,
				timer: 3000
			});
			let page = await browser.newPage();
			await page.goto('https://lobby.ogame.gameforge.com/');
			page = await loginfct(page, browser);
			await page.waitFor(rdm(6000));
			await getAllPlanette(page);
			console.log(planets);
			await moveChecker(page);
			await mainboucle(page, browser);
		});
	}
};

function getChromiumExecPath() {
	return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
}

async function getNewPageWhenLoaded(browser) {
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
				return isPageLoaded.match('complete|interactive') ?
					x(newPage) :
					x(newPagePromise);
			}
		})
	);
}

async function cleanotherpage(url, browser) {
	const pages = await browser.pages();
	for (const page of pages) {
		if (page.url() !== url) {
			page.close();
		}
	}
}

async function loginfct(page, browser) {
	await page.waitFor(rdm(5000));
	await page.click('#loginRegisterTabs ul.tabsList li');
	await page.waitFor(200);
	await page.focus('[name = "email"]');
	await page.keyboard.type(store.get('user.email'));
	await page.focus('[name = "password"]');
	await page.keyboard.type(store.get('user.password'));
	await page.click('#loginRegisterTabs .button.button-lg');
	await page.waitFor(rdm(5000));
	await page.click('#joinGame .button.button-default');
	page = await getNewPageWhenLoaded(browser);
	await page.waitFor(rdm(2000));
	cleanotherpage(page.url(), browser);
	return page;
}

async function checkco(page, browser) {
	await page.waitFor(rdm(5000));
	if (page.url() === 'https://lobby.ogame.gameforge.com/fr_FR/hub') {
		await page.click('#joinGame .button.button-default');
		page = await getNewPageWhenLoaded(browser);
		await page.waitFor(rdm(2000));
		cleanotherpage(page.url(), browser);
		await page.waitFor(rdm(5000));
	}

	return page;
}

async function getAllPlanette(page) {
	planets = await page.evaluate(() => {
		const array = [];
		$('.planet-koords').each(function () {
			array.push(this.textContent);
		});
		return array;
	});
}

async function moveChecker(page) {
	if (await isLocatorReady(await page.$('#eventboxFilled'), page)) {
		await page.click('#eventboxFilled');
	}

	await page.waitFor(rdm(500));
	if (await page.$('.eventFleet') !== null) {
		console.log('mouvement de flotte détecté');
		const data = await page.evaluate(() => {
			const array = [];
			$('.eventFleet').each(function () {
				const object = {
					dest: this.children[8].textContent
				};
				$.each(this.attributes, function () {
					object[this.name] = this.value;
				});
				array.push(object);
			});
			return array;
		});
		// Console.log(data)
		for (const move of data) {
			if (move['data-mission-type'] === '1' && planets.includes(move.dest)) {
				console.log('attaque détécté !');
				if (alreadysend.includes(move.id)) {
					return;
				}

				if (store.get('user.soundnotif')) {
					const win2 = new BrowserWindow({
						width: 200,
						height: 200,
						show: false
					});

					win2.loadFile(path.join(__dirname, 'views', 'index2.html'));
					sleep(15000).then(() => {
						win2.close();
					});
				}

				if (store.get('user.mailnotif')) {
					mail.send(store.get('user.email'));
				}

				Alert.fireToast({
					position: 'bottom-end',
					title: 'Incoming attack ',
					type: 'warning',
					showConfirmButton: false,
					timer: 3000
				});

				alreadysend.push(move.id);
			}
		}
	} else {
		console.log('pas de move de flotte');
	}
}

async function mainboucle(page, browser) {
	if (stop) {
		return browser.close();
	}

	try {
		page = await checkco(page, browser);
		const example = await page.$$('div#planetList div');
		const waittime = waiting();
		console.log('next check in : ' + waittime);
		await page.waitFor(waittime);
		await example[Math.floor((Math.random() * example.length - 1))].click();
		page = await checkco(page, browser);
		await getAllPlanette(page);
		await moveChecker(page);
		mainboucle(page, browser);
	} catch {
		page = await checkco(page, browser);
		mainboucle(page, browser);
	}
}

async function isLocatorReady(element, page) {
	const isVisibleHandle = await page.evaluateHandle(error => {
		const style = window.getComputedStyle(error);
		return (style && style.display !== 'none' &&
				style.visibility !== 'hidden' && style.opacity !== '0');
	}, element);
	const visible = await isVisibleHandle.jsonValue();
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
	return 360000 + Math.floor(Math.random() * (360000 + 1));
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
