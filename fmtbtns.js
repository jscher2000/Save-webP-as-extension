/* 
  Save webP as PNG or JPEG
  Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - fifth try
  version 0.6 - options for menu item behavior, highlight unsaved options page changes
  version 0.7 - enable subfolder, file name, and auto-close options
*/

/**** Create and populate data structure ****/

// Default starting values
var oPrefs = {
	/* menu action */
	menuplain: 'showbar',		// show button bar
	menushift: 'savepng',		// save png
	menuctrl: 'savejpg92',		// save jpeg at 92%
	/* Format buttons for overlay bar, color scheme */
	btnpng: true,				// show PNG button
	btnjpg100: true,			// show JPG 100% button
	btnjpg92: true,				// show JPG 92% button
	btnjpg85: true,				// show JPG 85% button
	btnjpg80: true,				// show JPG 80% button
	btnjpg75: true,				// show JPG 75% button
	btnautoclose: false,		// remove button bar after downloading
	btndark: false,				// show dark buttons
	/* Save dialog, path, file name options */
	saveas: null,				// SaveAs parameter for Download() yes/no/null
	usefolder: true,			// subfolder for download
	customfolder: null,			// custom subfolder name
	subfolder: 'none',			// Date/Host/ImgServer/None
	namedate: false,			// Add date into file name
	nametime: false,			// Add time into file name
	namehost: false,			// Add host into file name
	nameimg: false,				// Add image server into file name
	/* Other options */
	keepprivate: true			// Don't add downloads from incognito to history
}

// Update oPrefs from storage
browser.storage.local.get("prefs").then( (results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});

let sep = '/';
if (browser.runtime.PlatformOs == 'win') sep = '\\';

/**** Menu and Button Bar Stuff ****/

// Right-click context menu entry
browser.menus.create({
	id: 'saveWebPas',
	title: 'Save webP as...',
	contexts: ['image']
});
// Inject styles and content script for right-clicked image
browser.menus.onClicked.addListener((menuInfo, currTab) => {
	// Check modifiers to determine action
	var axn = 'showbar';
	switch (menuInfo.modifiers.length){
		case 0: //Plain
			axn = oPrefs.menuplain;
			break;
		case 1: // Shift or Ctrl
			if (menuInfo.modifiers.includes('Shift')){
				axn = oPrefs.menushift;
			} else if ((browser.runtime.PlatformOs == 'mac' && menuInfo.modifiers.includes('Command')) ||
						(browser.runtime.PlatformOs != 'mac' && menuInfo.modifiers.includes('Ctrl'))){
				axn = oPrefs.menuctrl;
			} else {
				// What is the user trying? Just show the bar.
			}
			break;
		default:
			// User held down two modifier keys? Just show the bar.
	}
	// Implement 'showbar'
	if (axn == 'showbar'){
		var cssfile = '/light.css';
		if (oPrefs.btndark == true) cssfile = '/dark.css';
		var btns = [];
		if (oPrefs.btnpng == true) btns.push({params: 'p,1', label: 'PNG', span: null});
		if (oPrefs.btnjpg100 == true) btns.push({params: 'j,1', label: 'JPG', span: '100'});
		if (oPrefs.btnjpg92 == true) btns.push({params: 'j,0.92', label: 'JPG', span: '92%'});
		if (oPrefs.btnjpg85 == true) btns.push({params: 'j,0.85', label: 'JPG', span: '85%'});
		if (oPrefs.btnjpg80 == true) btns.push({params: 'j,0.80', label: 'JPG', span: '80%'});
		if (oPrefs.btnjpg75 == true) btns.push({params: 'j,0.75', label: 'JPG', span: '75%'});
		btns.push({params: 'options', label: '⚙️', span: null});
		btns.push({params: 'close', label: 'X', span: null});

		browser.tabs.insertCSS({
				file: cssfile,
				frameId: menuInfo.frameId,
				cssOrigin: "user"
		}).then(() => {
			browser.tabs.executeScript({
				code:  `/* Save webP as... v0.7 */
						var autoclose = ${oPrefs.btnautoclose};
						// Set up variables from menu click
						var w = browser.menus.getTargetElement(${menuInfo.targetElementId});
						var u = new URL('${menuInfo.srcUrl}');
						function convert_${menuInfo.targetElementId}(el, imghost, path, fmt, ext, qual){
							// Create new filename
							var f = path.slice(path.lastIndexOf('/') + 1).replace(/\.webp/i, '_webp').replace(/\.png/i, '_png').replace(/\.jpg/i, '_jpg').replace(/\.gif/i, '_gif');
							if (qual != 1) f += '_' + (100 * parseFloat(qual));
							f += '.' + ext;
							// Create canvas
							var canv = document.createElement('canvas');
							canv.width = w.naturalWidth;
							canv.height = w.naturalHeight;
							var ctx = canv.getContext('2d');
							if (ext == 'jpg'){
								// Match the background color (fix "white" to avoid transparency)
								var b = window.getComputedStyle(w).getPropertyValue('background-color');
								if (b === 'rgba(0, 0, 0, 0)') b = '#fff';
								ctx.fillStyle = b;
								ctx.fillRect(0, 0, canv.width, canv.height);
							}
							// Then add the image
							ctx.drawImage(w, 0, 0);
							canv.toBlob((blob) => {
								// Send blob to background script for downloading
								browser.runtime.sendMessage({
									"download": {
										cblob: blob,
										fname: f, 
										imghost: imghost,
										imgpath: path,
										pghost: location.hostname
									}
								})
								.then(() => {
									if (autoclose) convbtn_${menuInfo.targetElementId}(null); // remove the bar
								})
								.catch((err) => {console.log('An error occurred while saving the image: '+err.message);});
							}, fmt, qual);
						}
						function convbtn_${menuInfo.targetElementId}(e){
							// Execute button click (save image or close)
							if (e){
								tgt = e.target;
								if (!tgt.hasAttribute('params')) tgt = tgt.closest('button');
								var params = tgt.getAttribute('params').split(',');
							} else { // force close
								params = ['close'];
							}
							if (params[0] == 'p') convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'png', 1);
							else if (params[0] == 'j'){
								convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/jpeg', 'jpg', parseFloat(params[1]));
							} else if (params[0] == 'options'){
								browser.runtime.sendMessage({"options": "show"});
							} else if (params[0] == 'close'){
								var bar = document.getElementById('btns_${menuInfo.targetElementId}');
								if (bar){
									bar.removeEventListener('click', convbtn_${menuInfo.targetElementId}, false);
									bar.remove();
								}
								window.removeEventListener('resize', setpos_${menuInfo.targetElementId}, false);
							}
						}
						function setpos_${menuInfo.targetElementId}(e){
							// Line up the button bar with the top of the image
							var tgt = document.getElementById('btns_${menuInfo.targetElementId}');
							if (!tgt) return;
							var br = w.getBoundingClientRect();
							tgt.style.top = window.scrollY + br.top + 'px';
							tgt.style.left = window.scrollX + br.left + 'px';
							tgt.style.width = br.width + 'px';
							// Make sure the bar is in view
							if (br.top < 0 || br.top > window.innerHeight) tgt.scrollIntoView();
						}
						/* This only works on some sites, so unfortunately, we need to use <all_urls>
						// Avoid canvas taint from cross-site images
						if (u.hostname != location.hostname) w.setAttribute('crossorigin', 'Anonymous');
						*/
						// Create button bar and position it
						var d = document.createElement('div');
						d.id = 'btns_${menuInfo.targetElementId}'; 
						d.className = 'saveWebPasbtns';
						var btns = ${JSON.stringify(btns)};
						for (var i=0; i<btns.length; i++){
							var b = document.createElement('button');
							b.setAttribute('params', btns[i].params);
							b.appendChild(document.createTextNode(btns[i].label));
							if (btns[i].span){
								var s = document.createElement('span');
								s.appendChild(document.createTextNode(btns[i].span));
								b.appendChild(s);
							}
							d.appendChild(b);
						}
						document.body.appendChild(d);
						setpos_${menuInfo.targetElementId}();
						// Set up event listeners
						d.addEventListener('click', convbtn_${menuInfo.targetElementId}, false);
						window.addEventListener('resize', setpos_${menuInfo.targetElementId}, false);
						'WTF'`
			});
		}).catch((err) => {
			browser.tabs.executeScript({
				code: `alert("Apologies, but it didn't work. Firefox says: '${err}'");`
			})
		});
	} else { // Use the specified format and quality
		browser.tabs.executeScript({
			code:  `/* Save webP as... v0.7 */
					// Set up variables from menu click
					var w = browser.menus.getTargetElement(${menuInfo.targetElementId});
					var u = new URL('${menuInfo.srcUrl}');
					function convert_${menuInfo.targetElementId}(el, imghost, path, fmt, ext, qual){
						// Create new filename
						var f = path.slice(path.lastIndexOf('/') + 1).replace(/\.webp/i, '_webp').replace(/\.png/i, '_png').replace(/\.jpg/i, '_jpg').replace(/\.gif/i, '_gif');
						if (qual != 1) f += '_' + (100 * parseFloat(qual));
						f += '.' + ext;
						// Create canvas
						var canv = document.createElement('canvas');
						canv.width = w.naturalWidth;
						canv.height = w.naturalHeight;
						var ctx = canv.getContext('2d');
						if (ext == 'jpg'){
							// Match the background color (fix "white" to avoid transparency)
							var b = window.getComputedStyle(w).getPropertyValue('background-color');
							if (b === 'rgba(0, 0, 0, 0)') b = '#fff';
							ctx.fillStyle = b;
							ctx.fillRect(0, 0, canv.width, canv.height);
						}
						// Then add the image
						ctx.drawImage(w, 0, 0);
						canv.toBlob((blob) => {
							// Send blob to background script for downloading
							browser.runtime.sendMessage({
								"download": {
									cblob: blob,
									fname: f, 
									imghost: imghost,
									imgpath: path,
									pghost: location.hostname
								}
							})
							.catch((err) => {console.log('An error occurred while saving the image: '+err.message);});
						}, fmt, qual);
					}
					var fmt = '${axn}'.slice(4); //Past the word save
					if (fmt == 'png'){
						convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'png', 1);
					} else {
						if (fmt.slice(0,3) == 'jpg'){
							var qual = parseFloat(fmt.slice(3)) / 100;
							convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/jpeg', 'jpg', qual);
						} else {
							alert('Sorry, but I did not recognize the desired format from ' + fmt);
						}
					}
					'WTF'`
		}).catch((err) => {
			browser.tabs.executeScript({
				code: `alert("Apologies, but the quick save didn't work. Firefox says: '${err}'");`
			})
		});
	}
});

/**** Handle Requests from Content and Options ****/

// Perform the download with the blob sent from the content
function handleMessage(request, sender, sendResponse){
	if ('download' in request){
		// Assemble options
		var opts = {};
		opts.url = URL.createObjectURL(request.download.cblob);

		var downloadpath = '';
		if (oPrefs.usefolder == true && oPrefs.customfolder == null){
			downloadpath += 'Save_webP/';
		} else if (oPrefs.usefolder == true && oPrefs.customfolder != null){
			downloadpath += oPrefs.customfolder + '/';
		}
		// Subfolder options
		switch (oPrefs.subfolder){
			case 'date':
				downloadpath += datetime('d').slice(1) + '/';
				break;
			case 'host':
				downloadpath += request.download.pghost + '/';
				break;
			case 'img':
				downloadpath += request.download.imghost + '/';
				break;
		}
		// File name options
		var fname = request.download.fname;
		if (oPrefs.namehost && request.download.pghost.length > 0){
			fname = fname.slice(0, fname.length-4) + '_(' + request.download.pghost + ')' + fname.slice(-4);
		}
		if (oPrefs.nameimg && request.download.imghost.length > 0){
			fname = fname.slice(0, fname.length-4) + '_[' + request.download.imghost + ']' + fname.slice(-4);
		}
		if (oPrefs.namedate || oPrefs.nametime) {
			var sType = (oPrefs.namedate) ? 'd' : '';
			sType += (oPrefs.nametime) ? 't' : '';
			var sDT = datetime(sType);
			fname = fname.slice(0, fname.length-4) + sDT + fname.slice(-4);
		}
		opts.filename = downloadpath + fname;
		
		switch (oPrefs.saveas){
			case 'yes': opts.saveAs = true; break;
			case 'no': opts.saveAs = false; break;
			default: /* omit the argument to use browser default */
		}

		if (sender.tab.incognito == true){
			if (oPrefs.keepprivate === false) opts.incognito = false;
			else opts.incognito = true;
		}
		browser.downloads.download(opts).then((msg)=> {
			sendMessage({success: true});
		}).catch((err) => {
			console.log('An error occurred while saving the image: '+err.message);
		});
	} else if ("options" in request) {
		browser.runtime.openOptionsPage();
	} else if ("update" in request) {
		// Receive pref hint from Options page and update oPrefs from storage
		if (request["update"] == 'fromStorage'){
			browser.storage.local.get("prefs").then((results) => {
				if (results.prefs != undefined){
					if (JSON.stringify(results.prefs) != '{}'){
						var arrSavedPrefs = Object.keys(results.prefs)
						for (var j=0; j<arrSavedPrefs.length; j++){
							oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
						}
					}
				}
			}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});
		}
	}
}
browser.runtime.onMessage.addListener(handleMessage);

function datetime(strType){
	var d = new Date(), dt = '';
	if (strType != 't'){
		dt += '_' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
	}
	if (strType != 'd'){
		dt += '_' + d.toTimeString().slice(0, 8).replace(/:/g, '.');
	}
	return dt;
}