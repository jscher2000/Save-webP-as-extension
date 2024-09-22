/* 
  Save webP as PNG or JPEG
  Copyright 2024. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - fifth try
  version 0.6 - options for menu item behavior, highlight unsaved options page changes
  version 0.7 - enable subfolder, file name, and auto-close options
  version 0.8 - animated GIF option (via ezgif.com), automatic bar display option
  version 0.9 - image info, bug fixes
  version 0.9.1 - option to show the stand-alone bar automatically only for image/webp
  version 0.9.2 - add performance info (size, timing)
  version 0.9.3 - bug fixes
  version 0.9.4 - info and button font-size adjustment, bug fixes
  version 1.0 - Save as IE 11 button
  version 1.1 - File naming fixes (make original extension and JPEG quality optional, fix missing file name bug)
  version 1.2 - Save as IE 11 available as a menu item action; bug fix for stand-alone images
  version 1.3 - Detect stand-alone image file names from title
  version 1.3.1 - Bug fix for quick save
  version 1.3.2 - File name detection for automatically displayed bar on stand-alone images
  version 1.3.3 - Additional error detection for failed saves
  version 1.3.4 - Cleanse file names of illegal characters
  version 1.3.5 - Truncate file names longer than 200 characters; Quick Save in frames; do not display error message when user cancels save; style hack for Google Photos
  version 1.4 - Copy to clipboard; fix for irrepressible button bar on stand-alone image pages
  version 1.5.1 - Permission error handling (options popup)
  version 1.5.2 - Prefer currentSrc when different from src, un-transform enlarged button bar
  version 1.5.3 - Allow sending .gif/.gifv URL to ezgif.com for conversion; improve logic of the IE11 button
  version 1.5.4 - Bug fix for file names in stand-alone window, clarification of folder save options
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
	btncopy: true,				// show Copy to Clipboard button
	btnsaveasie: true,			// show Save as IE 11 button
	btnanigif: true,			// show AniGIF button
	btnautoclose: false,		// remove button bar after downloading
	btnstandalone: true,		// show bar automatically on image pages
	btnstalwebp: true,			//   above feature is for image/webp and image/avif only [true as of 1.3.3]
	btndark: false,				// show dark buttons
	/* Save dialog, path, file name options */
	saveas: null,				// SaveAs parameter for Download() yes/no/null
	usefolder: true,			// subfolder for download
	customfolder: null,			// custom subfolder name
	subfolder: 'none',			// Date/Host/ImgServer/None
	nameorigext: true,			// Add original extension (e.g., _png) to file name
	namequality: true,			// Add JPEG quality (e.g., _92) to file name
	namedate: false,			// Add date into file name
	nametime: false,			// Add time into file name
	namehost: false,			// Add host into file name
	nameimg: false,				// Add image server into file name
	/* Other options */
	keepprivate: true,			// Don't add downloads from incognito to history
	expandinfo: false,			// Show info section on overlay for inline (session only)
	infofontsize: 16,			// Font-size for info text
	btnfontsize: 14,			// Font-size for button text
	noperm: 'popup',			// Options are popup, tab, notify, silent
	nopermkeepopen: false		// Whether to close the popup or tab automatically
}

// Register content script for automatically displayed button bar
let cs = null;
async function doContent(){
	if (oPrefs.btnstandalone === true) {
		cs = await browser.contentScripts.register({
			matches: ['http://*/*', 'https://*/*'],
			js: [{file: 'detectstandalone.js'}],
			runAt: "document_idle"
		});
	} else if (cs != null) {
		cs.unregister();
		cs = null;
	}
}

// Update oPrefs from storage
browser.storage.local.get("prefs").then( (results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs);
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
	// Content script registration
	doContent();
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
		var fontsizeoverride = `body {
			--swpas-btn-size: ${oPrefs.btnfontsize}px !important;
			--swpas-info-size: ${oPrefs.infofontsize}px !important;
		}`;
		var btns = [];
		if (oPrefs.btnpng == true) btns.push({params: 'p,1', label: 'PNG', span: null});
		if (oPrefs.btnjpg100 == true) btns.push({params: 'j,1', label: 'JPG', span: '100'});
		if (oPrefs.btnjpg92 == true) btns.push({params: 'j,0.92', label: 'JPG', span: '92%'});
		if (oPrefs.btnjpg85 == true) btns.push({params: 'j,0.85', label: 'JPG', span: '85%'});
		if (oPrefs.btnjpg80 == true) btns.push({params: 'j,0.80', label: 'JPG', span: '80%'});
		if (oPrefs.btnjpg75 == true) btns.push({params: 'j,0.75', label: 'JPG', span: '75%'});
		if (oPrefs.btncopy == true) btns.push({params: 'cop', label: '📋', span: null, title: 'Copy to Clipboard in PNG format'});
		if (oPrefs.btnsaveasie == true) btns.push({params: 'rr', label: '💾', span: 'IE', title: 'Re-request as legacy browser IE 11'});
		if (oPrefs.btnanigif == true) btns.push({params: 'anigif', label: 'GIF(V)', span: null, title: 'Send URL to ezGIF'});
		btns.push({params: 'info', label: 'ℹ️', span: null});
		btns.push({params: 'options', label: '⚙️', span: null, title: 'Open Settings'});
		btns.push({params: 'close', label: 'X', span: null, title: 'Close bar'});
		
		browser.tabs.insertCSS({
				file: cssfile,
				frameId: menuInfo.frameId,
				cssOrigin: "user"
		}).then(() => {
			browser.tabs.insertCSS({
				code: fontsizeoverride,
				frameId: menuInfo.frameId,
				cssOrigin: "user"
			}).then(() => {
			browser.tabs.executeScript({
				frameId: menuInfo.frameId,
				code:  `/* Save webP as... v1.5.4 */
						var autoclose = ${oPrefs.btnautoclose};
						var expandinfo = ${oPrefs.expandinfo};
						var nameorigext = ${oPrefs.nameorigext};
						var namequality = ${oPrefs.namequality};
						var docct = document.contentType;
						// Set up variables from menu click
						var w = browser.menus.getTargetElement(${menuInfo.targetElementId});
						var u = new URL('${menuInfo.srcUrl}');
						var curs = null;
						if (w.src != w.currentSrc){
							u = new URL(w.currentSrc);
							curs = new Image();
							curs.src = u.href;
						}
						var ieu = u;
						if (w.src.toLowerCase().indexOf('.gif') > 0 && u.href.toLowerCase().indexOf('.webp') > 0){
							// v1.5.3 Try to use original source for IE11 button for animated GIF images
							ieu = new URL(w.src);
						}
						function convert_${menuInfo.targetElementId}(el, imghost, path, fmt, ext, qual){
							// Create new filename
							var f = '', e;
							if (docct.indexOf('image/') === 0){ // try title for stand-alone image
								f = document.title.trim();
								if (f.indexOf('(') > -1){
									if (document.imageIsResized){ // ignore Scaled (xx%)
										e = f.lastIndexOf('(', f.length - 6);
									} else {
										e = f.lastIndexOf('(', f.length - 7); // Issue #32
									}
									f = f.slice (0, e).trim();
								}
							}
							if (f.length === 0) f = path.slice(path.lastIndexOf('/') + 1);
							if (f.length === 0) f = 'swpas_temp';
							if (f.slice(0,1) == '.') f = 'swpas_temp' + f;
							if (f.length > 200) f = f.slice(0, 200); // v1.3.5 workaround
							if (nameorigext == true) f = f.replace(/\.webp/i, '_webp').replace(/\.png/i, '_png').replace(/\.jpg/i, '_jpg').replace(/\.gif/i, '_gif');
							else f = f.replace(/\.webp/i, '').replace(/\.png/i, '').replace(/\.jpg/i, '').replace(/\.gif/i, '');
							f = f.replace(/[/\\?%*:|"<>]/g,'-').replace(/-+/g,'-'); // v1.3.4
							if (qual != 1 && namequality == true) f += '_' + (100 * parseFloat(qual));
							f += '.' + ext;
							// Create canvas
							var canv = document.createElement('canvas');
							if (curs){
								canv.width = curs.naturalWidth;
								canv.height = curs.naturalHeight;
							} else {
								canv.width = w.naturalWidth;
								canv.height = w.naturalHeight;
							}
							var ctx = canv.getContext('2d');
							if (ext == 'jpg'){
								// Match the background color (fix "white" to avoid transparency)
								var b = window.getComputedStyle(w).getPropertyValue('background-color');
								if (b === 'rgba(0, 0, 0, 0)') b = '#fff';
								ctx.fillStyle = b;
								ctx.fillRect(0, 0, canv.width, canv.height);
							}
							// Then add the image
							if (curs) ctx.drawImage(curs, 0, 0);
							else ctx.drawImage(w, 0, 0);
							canv.toBlob((blob) => {
								if (ext != 'copy2clip'){
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
									.then((resp) => {
										if (resp.succeeded == false && resp.result != 'Download canceled by the user'){
											window.alert('An error occurred while saving the image file. Error message: ' + resp.result + '. Parameters: ' + resp.params);
										}
										if (autoclose) convbtn_${menuInfo.targetElementId}(null); // remove the bar
									})
									.catch((err) => {window.alert('An error occurred while saving the image: '+err.message);});
								} else {
									// Send ArrayBuffer of blob to background script for saving to clipboard
									blob.arrayBuffer().then((arrbuff) => {
										browser.runtime.sendMessage({
											"copy2clip": {
												abuff: arrbuff
											}
										}).then((resp) => {
											var cbtn = document.querySelector('#btns_${menuInfo.targetElementId} button[params="cop"]');
											if (cbtn){
												if (resp.succeeded == true) cbtn.classList.add('success');
												else cbtn.classList.add('failure');
											}
											if (resp.succeeded == false){
												window.alert('An error occurred while writing the image to the clipboard: ' + resp.result);
											}
											if (autoclose) convbtn_${menuInfo.targetElementId}(null); // remove the bar
										}).catch((err) => {window.alert('An error occurred writing to the clipboard: '+err.message);});	
									});
								}
							}, fmt, qual);
						}
						function convbtn_${menuInfo.targetElementId}(e){
							// Execute button click (save image or close)
							if (e){
								tgt = e.target;
								if (!tgt.hasAttribute('params')) tgt = tgt.closest('button');
								var params = tgt.getAttribute('params').split(',');
								e.preventDefault();
								e.stopPropagation();
							} else { // force close
								params = ['close'];
							}
							if (params[0] == 'rr'){ // [v1.0]
								var newloc = new URL(ieu.href);
								if (newloc.search.length == 0) newloc.search = '?swapjIE11=0';
								else newloc.search += '&swapjIE11=0';
								location.href = newloc.href;
							} else if (params[0] == 'p'){
								convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'png', 1);
							} else if (params[0] == 'j'){
								convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/jpeg', 'jpg', parseFloat(params[1]));
							} else if (params[0] == 'cop'){
								convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'copy2clip', 1);
							} else if (params[0] == 'anigif'){
								if (u.pathname.slice(-5).toLowerCase() == '.webp'){
									if (confirm('Send image URL to ezgif.com for conversion to animated GIF?')){
										browser.runtime.sendMessage({"newtab": {
												url: 'https://ezgif.com/webp-to-gif?url='+u
											}
										});
									} 
								} else if (u.pathname.slice(-4).toLowerCase() == '.gif' || u.pathname.slice(-5).toLowerCase() == '.gifv') {
									if (confirm('URL has a .gif/.gifv extension. Send image URL to ezgif.com for conversion to animated GIF anyway?')){
										browser.runtime.sendMessage({"newtab": {
												url: 'https://ezgif.com/webp-to-gif?url='+u
											}
										});
									} 
								} else {
									alert('Wrong file type??');
								}
							} else if (params[0] == 'info'){
								var infodiv = document.getElementById('info_${menuInfo.targetElementId}');
								if (infodiv){
									if (infodiv.style.display != 'none') infodiv.style.display = 'none';
									else infodiv.style.display = '';
									browser.runtime.sendMessage({"toggleinfo": infodiv.style.display});
								} else {
									alert('Hmm, sorry, problem.');
								}
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
							if (docct.indexOf('image/') === 0){ // stand-alone
								tgt.style.left = '50%';
								tgt.style.width = '600px';
								tgt.style.marginLeft = '-300px';
								tgt.style.maxWidth = '90vw';
								if (br.top > tgt.offsetHeight){
									tgt.style.top = window.scrollY + (br.top - tgt.offsetHeight) + 'px';
								} else {
									tgt.style.top = '0px';
									if (location.hostname.indexOf('photos.google.com') > -1) tgt.style.top = '80px';
								}
								// Make sure the bar is in view
								if (br.top < 0 || br.top > window.innerHeight) tgt.scrollIntoView();
							} else { // overlaid inline
								var par = w.closest('p, div, section, aside, header, main, footer, article, body');
								par.appendChild(tgt);
								if (window.getComputedStyle(par,null).getPropertyValue("position") == 'static') par.style.position = 'relative';
								tgt.style.top = Math.max(br.top - par.getBoundingClientRect().top + par.scrollTop, 0) + 'px';
								if (location.hostname.indexOf('photos.google.com') > -1) tgt.style.top = '80px';
								tgt.style.left = window.scrollX + Math.max(br.left - par.getBoundingClientRect().left, 0) + 'px';
								tgt.style.width = br.width + 'px';
								// Make sure the bar is in view
								if (br.top < 0 || br.top > window.innerHeight) tgt.scrollIntoView();
								// Un-transform if relevant [1.5.2]
								var tgtrect = tgt.getBoundingClientRect();
								var tgtwidth = tgtrect.right - tgtrect.left;
								if (tgtwidth > br.width) tgt.style.transform = 'scale(' + (br.width / tgtwidth) + ') translate(' + ((tgtwidth - br.width) / 2 * -1) + 'px, 0px)';
							}
						}
						// Create button bar/info panel and position it
						var di = document.createElement('div'); // start of "new in 0.9"
						di.id = 'info_${menuInfo.targetElementId}'; 
						di.className = 'saveWebPasInfo';
						var p = document.createElement('p');
						p.appendChild(document.createTextNode('Location: ' + u.href));
						di.appendChild(p);
						p = document.createElement('p');
						if (docct.indexOf('image/') === 0){ // stand-alone
							p.appendChild(document.createTextNode('Type: ' + document.contentType.slice(document.contentType.indexOf('/')+1).toUpperCase() + ' (document.contentType=' + document.contentType + ')'));
						} else { //inline
							p.appendChild(document.createTextNode('Type: (unknown)'));
							if (!expandinfo) di.style.display = 'none';
						}
						di.appendChild(p);
						var infotext = 'Dimensions: ' + w.naturalWidth + 'px × ' + w.naturalHeight + 'px';
						if (docct.indexOf('image/') === -1){
							if (w.width != w.naturalWidth || w.height != w.naturalHeight){
								infotext += ' (Scaled to: ' + w.width + 'px × ' + w.height + 'px)';
							}
						}
						p = document.createElement('p');
						p.appendChild(document.createTextNode(infotext));
						di.appendChild(p);
						var sz = '(Not accessible)';
						if (window.performance){
							var imgp = performance.getEntriesByName(u.href);
							if (imgp && imgp.length > 0 && imgp[0].decodedBodySize > 0){
								sz = (+(Math.round(imgp[0].decodedBodySize/1024 + 'e+2')  + 'e-2')) + ' KB (' + imgp[0].decodedBodySize + ')';
								if (imgp[0].transferSize > 0) sz += ' (transferred ' + (+(Math.round(imgp[0].transferSize/1024 + 'e+2')  + 'e-2')) + ' KB (' + imgp[0].transferSize + ') in ' +  (+(Math.round(imgp[0].duration/1000 + 'e+2')  + 'e-2')) + ' seconds)';
							}
						}
						p = document.createElement('p');
						p.appendChild(document.createTextNode('Size: ' + sz));
						di.appendChild(p);
						if (docct.indexOf('image/') === -1){
							if (w.getAttribute('alt')){
								p = document.createElement('p');
								p.appendChild(document.createTextNode('Alt text: ' + w.getAttribute('alt')));
								di.appendChild(p);
							}
						} // end of "new in 0.9"
						var d = document.createElement('div');
						d.id = 'btns_${menuInfo.targetElementId}'; 
						d.className = 'saveWebPasbtns';
						d.appendChild(di);
						var btns = ${JSON.stringify(btns)};
						for (var i=0; i<btns.length; i++){
							if (btns[i].params != 'info' || document.contentType.indexOf('image/') === -1){
								var b = document.createElement('button');
								b.setAttribute('params', btns[i].params);
								b.appendChild(document.createTextNode(btns[i].label));
								if (btns[i].span){
									var s = document.createElement('span');
									s.appendChild(document.createTextNode(btns[i].span));
									b.appendChild(s);
								}
								if (btns[i].title) b.setAttribute('title', btns[i].title);
								d.appendChild(b);
							}
						}
						document.body.appendChild(d);
						setpos_${menuInfo.targetElementId}();
						// Set up event listeners
						d.addEventListener('click', convbtn_${menuInfo.targetElementId}, false);
						window.addEventListener('resize', setpos_${menuInfo.targetElementId}, false);
						'WTF'`
				});
			});
		}).catch((err) => {
			if (err.toString().indexOf('Missing host permission') > 0) {
				noperm(menuInfo.frameUrl || '', menuInfo.pageUrl || '', menuInfo.srcUrl || '', currTab.incognito);
			} else {
				browser.tabs.executeScript({
					code: `alert("Apologies, but it didn't work. Firefox says: '${err}'");`
				});
			}
		});
	} else if (axn == 'requestAsIE'){ // Trigger re-request
		browser.tabs.executeScript({
			code:  `/* Save webP as... v1.2 */
					var u = new URL('${menuInfo.srcUrl}');
					var newloc = new URL(u.href);
					if (newloc.search.length == 0) newloc.search = '?swapjIE11=0';
					else newloc.search += '&swapjIE11=0';
					location.href = newloc.href;
					'WTF'`
		});
	} else { // Use the specified format and quality (Quick Save)
		browser.tabs.executeScript({
			frameId: menuInfo.frameId,
			code:  `/* Save webP as... v1.5.4 */
					var nameorigext = ${oPrefs.nameorigext};
					var namequality = ${oPrefs.namequality};
					var docct = document.contentType; // v1.3.1
					// Set up variables from menu click
					var w = browser.menus.getTargetElement(${menuInfo.targetElementId});
					var u = new URL('${menuInfo.srcUrl}');
					var curs = null;
					if (w.src != w.currentSrc){
						u = new URL(w.currentSrc);
						curs = new Image();
						curs.src = u.href;
					}
					function convert_${menuInfo.targetElementId}(el, imghost, path, fmt, ext, qual){
						// Create new filename
						var f = '', e;
						if (docct.indexOf('image/') === 0){ // try title
							f = document.title.trim();
							if (f.indexOf('(') > -1){
								if (document.imageIsResized){ // ignore Scaled (xx%)
									e = f.lastIndexOf('(', f.length - 6);
								} else {
									e = f.lastIndexOf('(', f.length - 7); // Issue #32
								}
								f = f.slice (0, e).trim();
							}
						}
						if (f.length === 0) f = path.slice(path.lastIndexOf('/') + 1);
						if (f.length === 0) f = 'swpas_temp';
						if (f.slice(0,1) == '.') f = 'swpas_temp' + f;
						if (f.length > 200) f = f.slice(0, 200); // v1.3.5 workaround
						if (nameorigext == true) f = f.replace(/\.webp/i, '_webp').replace(/\.png/i, '_png').replace(/\.jpg/i, '_jpg').replace(/\.gif/i, '_gif');
						else f = f.replace(/\.webp/i, '').replace(/\.png/i, '').replace(/\.jpg/i, '').replace(/\.gif/i, '');
						f = f.replace(/[/\\?%*:|"<>]/g,'-').replace(/-+/g,'-'); // v1.3.4
						if (qual != 1 && namequality == true) f += '_' + (100 * parseFloat(qual));
						f += '.' + ext;
						// Create canvas
						var canv = document.createElement('canvas');
						if (curs){
							canv.width = curs.naturalWidth;
							canv.height = curs.naturalHeight;
						} else {
							canv.width = w.naturalWidth;
							canv.height = w.naturalHeight;
						}
						var ctx = canv.getContext('2d');
						if (ext == 'jpg'){
							// Match the background color (fix "white" to avoid transparency)
							var b = window.getComputedStyle(w).getPropertyValue('background-color');
							if (b === 'rgba(0, 0, 0, 0)') b = '#fff';
							ctx.fillStyle = b;
							ctx.fillRect(0, 0, canv.width, canv.height);
						}
						// Then add the image
						if (curs) ctx.drawImage(curs, 0, 0);
						else ctx.drawImage(w, 0, 0);
						canv.toBlob((blob) => {
							if (ext != 'copy2clip'){
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
								.then((resp) => {
									if (resp.succeeded == false && resp.result != 'Download canceled by the user'){
										window.alert('An error occurred while saving the image file. Error message: ' + resp.result + '. Parameters: ' + resp.params);
									}
								})
								.catch((err) => {alert('An error occurred while saving the image: '+err.message);});
							} else {
								// Send ArrayBuffer of blob to background script for saving to clipboard
								blob.arrayBuffer().then((arrbuff) => {
									browser.runtime.sendMessage({
										"copy2clip": {
											abuff: arrbuff
										}
									}).then((resp) => {
										if (resp.succeeded == false){
											window.alert('An error occurred while writing the image to the clipboard: ' + resp.result);
										}
									}).catch((err) => {window.alert('An error occurred writing to the clipboard: '+err.message);});	
								});
							}
						}, fmt, qual);
					}
					var fmt = '${axn}'.slice(4); //Past the word save
					if (fmt == 'png'){
						convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'png', 1);
					} else if (fmt == '2clip') {
						convert_${menuInfo.targetElementId}(w, u.hostname, u.pathname, 'image/png', 'copy2clip', 1);
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
			if (err.toString().indexOf('Missing host permission') > 0) {
				noperm(menuInfo.frameUrl || '', menuInfo.pageUrl || '', menuInfo.srcUrl || '', currTab.incognito);
			} else {
				browser.tabs.executeScript({
					code: `alert("Apologies, but the quick save didn't work. Firefox says: '${err}'");`
				});
			}
		});
	}
});

function standAloneBar(oTab, elSelector){
	// button bar for pages with stand-alone images (TODO: limit duplication of axn="showbar")
	var cssfile = '/light.css';
	if (oPrefs.btndark == true) cssfile = '/dark.css';
	var fontsizeoverride = `body {
		--swpas-btn-size: ${oPrefs.btnfontsize}px !important;
		--swpas-info-size: ${oPrefs.infofontsize}px !important;
	}`;
	var btns = [];
	if (oPrefs.btnpng == true) btns.push({params: 'p,1', label: 'PNG', span: null});
	if (oPrefs.btnjpg100 == true) btns.push({params: 'j,1', label: 'JPG', span: '100'});
	if (oPrefs.btnjpg92 == true) btns.push({params: 'j,0.92', label: 'JPG', span: '92%'});
	if (oPrefs.btnjpg85 == true) btns.push({params: 'j,0.85', label: 'JPG', span: '85%'});
	if (oPrefs.btnjpg80 == true) btns.push({params: 'j,0.80', label: 'JPG', span: '80%'});
	if (oPrefs.btnjpg75 == true) btns.push({params: 'j,0.75', label: 'JPG', span: '75%'});
	if (oPrefs.btncopy == true) btns.push({params: 'cop', label: '📋', span: null, title: 'Copy to Clipboard in PNG format'});
	if (oPrefs.btnsaveasie == true) btns.push({params: 'rr', label: '💾', span: 'IE11', title: 'Re-request as legacy browser IE 11'});
	if (oPrefs.btnanigif == true) btns.push({params: 'anigif', label: 'GIF(V)', span: null, title: 'Send URL to ezGIF'});
	btns.push({params: 'options', label: '⚙️', span: null, title: 'Open Settings'});
	btns.push({params: 'close', label: 'X', span: null, title: 'Close bar'});

	browser.tabs.insertCSS(oTab.id, {
			file: cssfile,
			cssOrigin: "user"
	}).then(() => {
		browser.tabs.insertCSS({
			code: fontsizeoverride,
			cssOrigin: "user"
		}).then(() => {
		browser.tabs.executeScript(oTab.id, {
			code:  `/* Save webP as... v1.5.4 */
					// check for "webp only"
					var webponly = ${oPrefs.btnstalwebp};
					var docct = document.contentType; // v1.3.2
					if (webponly == false || docct.toLowerCase() == 'image/webp' || docct.toLowerCase() == 'image/avif') {
						var autoclose = ${oPrefs.btnautoclose};
						var nameorigext = ${oPrefs.nameorigext};
						var namequality = ${oPrefs.namequality};
						// Set up variables from menu click
						var w = document.querySelector('${elSelector}');
						var u = new URL(w.src);
						function convert_standAlone(el, imghost, path, fmt, ext, qual){
							// Create new filename
							var f = '', e;
							if (docct.indexOf('image/') === 0){ // try title
								f = document.title.trim();
								if (f.indexOf('(') > -1){
									if (document.imageIsResized){ // ignore Scaled (xx%)
										e = f.lastIndexOf('(', f.length - 6);
									} else {
										e = f.lastIndexOf('(', f.length - 7); // Issue #32
									}
									f = f.slice (0, e).trim();
								}
							}
							if (f.length === 0) f = path.slice(path.lastIndexOf('/') + 1);
							if (f.length === 0) f = 'swpas_temp';
							if (f.slice(0,1) == '.') f = 'swpas_temp' + f;
							if (f.length > 200) f = f.slice(0, 200); // v1.3.5 workaround
							if (nameorigext == true) f = f.replace(/\.webp/i, '_webp').replace(/\.png/i, '_png').replace(/\.jpg/i, '_jpg').replace(/\.gif/i, '_gif');
							else f = f.replace(/\.webp/i, '').replace(/\.png/i, '').replace(/\.jpg/i, '').replace(/\.gif/i, '');
							f = f.replace(/[/\\?%*:|"<>]/g,'-').replace(/-+/g,'-'); // v1.3.4
							if (qual != 1 && namequality == true) f += '_' + (100 * parseFloat(qual));
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
								if (ext != 'copy2clip'){
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
									.then((resp) => {
										if (resp.succeeded == false && resp.result != 'Download canceled by the user'){
											window.alert('An error occurred while saving the image file. Error message: ' + resp.result + '. Parameters: ' + resp.params);
										}
										if (autoclose) convbtn_standAlone(null); // remove the bar
									})
									.catch((err) => {alert('An error occurred while saving the image: '+err.message);});
								} else {
									// Send ArrayBuffer of blob to background script for saving to clipboard
									blob.arrayBuffer().then((arrbuff) => {
										browser.runtime.sendMessage({
											"copy2clip": {
												abuff: arrbuff
											}
										}).then((resp) => {
											var cbtn = document.querySelector('#btns_standAlone button[params="cop"]');
											if (cbtn){
												if (resp.succeeded == true) cbtn.classList.add('success');
												else cbtn.classList.add('failure');
											}
											if (resp.succeeded == false){
												window.alert('An error occurred while writing the image to the clipboard: ' + resp.result);
											}
											if (autoclose) convbtn_standAlone(null); // remove the bar
										}).catch((err) => {window.alert('An error occurred writing to the clipboard: '+err.message);});	
									});
								}
							}, fmt, qual);
						}
						function convbtn_standAlone(e){
							// Execute button click (save image or close)
							if (e){
								tgt = e.target;
								if (!tgt.hasAttribute('params')) tgt = tgt.closest('button');
								var params = tgt.getAttribute('params').split(',');
								e.preventDefault();
								e.stopPropagation();
							} else { // force close
								params = ['close'];
							}
							if (params[0] == 'rr'){ // [v1.0]
								var newloc = new URL(u.href);
								if (newloc.search.length == 0) newloc.search = '?swapjIE11=0';
								else newloc.search += '&swapjIE11=0';
								location.href = newloc.href;
							} else if (params[0] == 'p'){
								convert_standAlone(w, u.hostname, u.pathname, 'image/png', 'png', 1);
							} else if (params[0] == 'j'){
								convert_standAlone(w, u.hostname, u.pathname, 'image/jpeg', 'jpg', parseFloat(params[1]));
							} else if (params[0] == 'cop'){
								convert_standAlone(w, u.hostname, u.pathname, 'image/png', 'copy2clip', 1);
							} else if (params[0] == 'anigif'){
								if (u.pathname.slice(-5).toLowerCase() == '.webp'){
									if (confirm('Send image URL to ezgif.com for conversion to animated GIF?')){
										browser.runtime.sendMessage({"newtab": {
												url: 'https://ezgif.com/webp-to-gif?url='+u
											}
										});
									} 
								} else if (u.pathname.slice(-4).toLowerCase() == '.gif' || u.pathname.slice(-5).toLowerCase() == '.gifv') {
									if (confirm('URL has a .gif/.gifv extension. Send image URL to ezgif.com for conversion to animated GIF anyway?')){
										browser.runtime.sendMessage({"newtab": {
												url: 'https://ezgif.com/webp-to-gif?url='+u
											}
										});
									} 
								} else {
									alert('Wrong file type??');
								}
							} else if (params[0] == 'options'){
								browser.runtime.sendMessage({"options": "show"});
							} else if (params[0] == 'close'){
								var bar = document.getElementById('btns_standAlone');
								if (bar){
									bar.removeEventListener('click', convbtn_standAlone, false);
									bar.remove();
								}
								window.removeEventListener('resize', setpos_standAlone, false);
							}
						}
						function setpos_standAlone(e){
							// Line up the button bar with the top of the image
							var tgt = document.getElementById('btns_standAlone');
							if (!tgt) return;
							var br = w.getBoundingClientRect();
							tgt.style.left = '50%';
							tgt.style.width = '640px';
							tgt.style.marginLeft = '-320px';
							tgt.style.maxWidth = '90vw';
							if (br.top > tgt.offsetHeight){
								tgt.style.top = window.scrollY + (br.top - tgt.offsetHeight) + 'px';
							} else {
								tgt.style.top = '0px';
							}
							// Make sure the bar is in view
							if (br.top < 0 || br.top > window.innerHeight) tgt.scrollIntoView();
						}
						// Create button bar/info panel and position it
						var di = document.createElement('div'); // start of "new in 0.9"
						di.id = 'info_standAlone'; 
						di.title = 'Prefer no automatic display? Click the Options (gear) button to manage the Auto-open setting.';
						di.className = 'saveWebPasInfo';
						var p = document.createElement('p');
						p.appendChild(document.createTextNode('Location: ' + u.href));
						di.appendChild(p);
						p = document.createElement('p');
						p.appendChild(document.createTextNode('Type: ' + document.contentType.slice(document.contentType.indexOf('/')+1).toUpperCase() + ' (document.contentType=' + document.contentType + ')'));
						di.appendChild(p);
						var infotext = 'Dimensions: ' + w.naturalWidth + 'px × ' + w.naturalHeight + 'px';
						p = document.createElement('p');
						p.appendChild(document.createTextNode(infotext));
						di.appendChild(p);
						var sz = '(Not accessible)';
						if (window.performance){
							var imgp = performance.getEntriesByName(u.href);
							if (imgp && imgp.length > 0 && imgp[0].decodedBodySize > 0){
								sz = (+(Math.round(imgp[0].decodedBodySize/1024 + 'e+2')  + 'e-2')) + ' KB (' + imgp[0].decodedBodySize + ')';
								if (imgp[0].transferSize > 0) sz += ' (transferred ' + (+(Math.round(imgp[0].transferSize/1024 + 'e+2')  + 'e-2')) + ' KB (' + imgp[0].transferSize + ') in ' +  (+(Math.round(imgp[0].duration/1000 + 'e+2')  + 'e-2')) + ' seconds)';
							}
						}
						p = document.createElement('p');
						p.appendChild(document.createTextNode('Size: ' + sz));
						di.appendChild(p); // end of "new in 0.9"
						var d = document.createElement('div');
						d.id = 'btns_standAlone'; 
						d.className = 'saveWebPasbtns';
						d.appendChild(di);
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
							if (btns[i].title) b.setAttribute('title', btns[i].title);
							d.appendChild(b);
						}
						document.body.appendChild(d);
						if (document.querySelectorAll('#btns_standAlone').length > 1) document.querySelectorAll('#btns_standAlone')[0].remove();
						setpos_standAlone();
						// Set up event listeners
						d.addEventListener('click', convbtn_standAlone, false);
						window.addEventListener('resize', setpos_standAlone, false);
					}
					'WTF'`
			});
		});
	}).catch((err) => {
		if (err.toString().indexOf('Missing host permission') > 0) {
			noperm(menuInfo.frameUrl || '', menuInfo.pageUrl || '', menuInfo.srcUrl || '', currTab.incognito);
		} else {
			browser.tabs.executeScript({
				code: `alert("Apologies, but it didn't work. Firefox says: '${err}'");`
			});
		}
	});
}

/***** Host permission popup *****/
function noperm(urlFrame, urlPage, urlMediaSrc, isPrivate){
	var urls = {
		frameUrl: urlFrame, 
		pageUrl: urlPage, 
		srcUrl: urlMediaSrc,
		keepopen: oPrefs.nopermkeepopen
	}
	switch (oPrefs.noperm){
		case 'popup':
			browser.windows.create({
				type: 'popup', 
				incognito: isPrivate,
				url: '/save-webp-as-page.html?urls=' + JSON.stringify(urls),
				height: 260,
				top: screen.height - 300,
				width: 600,
				left: screen.width/2 - 300
			});
			break;
		case 'tab':
			browser.tabs.create({
				url: '/save-webp-as-page.html?urls=' + JSON.stringify(urls)
			});
			break;
		case 'notify':
			browser.permissions.contains({
				permissions: ["notifications"]
			}).then((resContains) => {
				if (resContains === false){ // Show the popup
					console.log('Host permission error AND notifications permission denied. Showing popup instead.');
					browser.windows.create({
						type: 'popup', 
						incognito: isPrivate,
						url: '/save-webp-as-page.html?urls=' + JSON.stringify(urls),
						height: 260,
						top: screen.height - 300,
						width: 600,
						left: screen.width/2 - 300
					});
				} else { // We're good to show it
					notifier('Content Script Blocked!', 'Resticted (Mozilla) site or sandboxed page. For workarounds, choose popup in the add-on options.');
				}
			});
			break;
		default:
			console.log('Host permission error. No error handling selected? oPrefs.noperm = ' + oPrefs.noperm);
	}
}
function notifier(txtTitle, txtMsg){
	browser.notifications.create({
		type: "basic",
		title: txtTitle,
		message: txtMsg,
		iconUrl: "img/smiley128.png"
	}).then((nId) => {
		/* TODO: Later we can use alarms to schedule 
			browser.notifications.clear(nId) 
		but not today */
	}).catch((err) => {
		console.log('Error creating notification? ' + err);
	});
}

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
		if (fname.indexOf('swpas_temp') === 0){		// v1.1 embed hostname if possible when file is unnamed
			if (request.download.pghost.length > 0){
				fname = fname.replace('swpas_temp', 'unnamed_file_from_' + request.download.pghost + fname.slice(-4));
			} else {
				fname = fname.replace('swpas_temp', 'unnamed_file');
			}
		} else {
			if (oPrefs.namehost && request.download.pghost.length > 0){
				fname = fname.slice(0, fname.length-4) + '_(' + request.download.pghost + ')' + fname.slice(-4);
			}
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
			sendResponse({
				succeeded: true,
				result: JSON.stringify(msg), 
				params: JSON.stringify(opts)
			});
		}).catch((err) => {
			sendResponse({
				succeeded: false,
				result: err.message, 
				params: JSON.stringify(opts)
			});
		});
		return true;
	} else if ("standalone" in request) {
		if (oPrefs.btnstandalone === true){ // v1.4 because unregistering detectstandalone.js isn't working
			standAloneBar(sender.tab, request.standalone.selText);
		}
	} else if ("newtab" in request) {
		browser.tabs.create({
			url: request.newtab.url
		});
	} else if ("options" in request) {
		browser.runtime.openOptionsPage();
	} else if ("update" in request) {
		// Receive pref hint from Options page and update oPrefs from storage
		if (request["update"] == 'fromStorage'){
			browser.storage.local.get("prefs").then((results) => {
				if (results.prefs != undefined){
					if (JSON.stringify(results.prefs) != '{}'){
						var arrSavedPrefs = Object.keys(results.prefs);
						for (var j=0; j<arrSavedPrefs.length; j++){
							oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
						}
					}
				}
			}).then(() => { // register/unregister content script
				doContent();
			}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});
		}
	} else if ("toggleinfo" in request) {
		// handle as a session-only preference
		if (oPrefs.expandinfo) oPrefs.expandinfo = false;
		else oPrefs.expandinfo = true;
	} else if ("copy2clip" in request) {
		// Do we have the clipboardWrite permission?
		browser.permissions.contains({
			permissions: [
				"clipboardWrite"
			]
		}).then((result) => {
			if (result === true){ // write array buffer to clipboard in PNG format
				browser.clipboard.setImageData(request.copy2clip.abuff, "png").then((msg) => {
					sendResponse({
						succeeded: true,
						result: JSON.stringify(msg), 
						params: ""
					});
				}).catch((err) => {
					sendResponse({
						succeeded: false,
						result: err.message, 
						params: ""
					});
				});
			} else {
				sendResponse({
					succeeded: false,
					result: "Need the 'Input data to the clipboard' permission. Click the gear/wheel button to open Options, then click over to Permissions to grant this one.", 
					params: ""
				});
			}
		});
		return true;
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