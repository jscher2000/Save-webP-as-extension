/* 
  Save webP as PNG or JPEG
  Copyright 2024. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - fifth try
  version 0.6 - options for menu item behavior, highlight unsaved options page changes
  version 0.7 - enable subfolder, file name, and auto-close options
  version 0.8 - animated GIF option (via ezgif.com), automatic bar display option
  version 0.9 - image info, bug fixes
  version 0.9.1 - option to show the stand-alone bar automatically only for image/webp
  version 0.9.4 - info and button font-size adjustment, bug fixes
  version 1.0 - Save as IE 11 button
  version 1.1 - File naming fixes (make original extension and JPEG quality optional, fix missing file name bug)
  version 1.2 - Save as IE 11 available as a menu item action
  version 1.4 - Copy to clipboard
  version 1.5 - Permission error handling & workaround for sandbox issue
*/

/*** Initialize Page ***/

// Default starting values
var oSettings = {
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

// Update oSettings from storage
browser.storage.local.get("prefs").then( (results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oSettings[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
}).then(() => {
	// Context menu select's
	var sels = document.querySelectorAll('select[name^="menu"]');
	for (var i=0; i<sels.length; i++){
		var selopt = document.querySelector('select[name="' + sels[i].name + '"] option[value="' + oSettings[sels[i].name] + '"]');
		selopt.setAttribute('selected', 'selected');
	}
	// Font size selects
	sels = document.querySelectorAll('select[name*="fontsize"]');
	for (var i=0; i<sels.length; i++){
		var selopt = document.querySelector('select[name="' + sels[i].name + '"] option[value="size' + oSettings[sels[i].name] + '"]');
		selopt.setAttribute('selected', 'selected');
	}
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (i=0; i<chks.length; i++){
		if (oSettings[chks[i].name] == true) chks[i].checked = true;
		else chks[i].checked = false;
	}
	// Color scheme
	if (oSettings.btndark == true) document.forms[0].radColors.value = 'dark';
	else document.forms[0].radColors.value = 'light';
	// Save dialog
	switch (oSettings.saveas){
		case 'yes': document.forms[0].radSaveAs.value = 'yes'; break;
		case 'no': document.forms[0].radSaveAs.value = 'no'; break;
		default: document.forms[0].radSaveAs.value = 'omit';
	}
	// Folder
	switch (oSettings.usefolder){
		case false: document.forms[0].radFolder.value = 'default'; break;
		case true: 
			switch (oSettings.customfolder){
				case null: document.forms[0].radFolder.value = 'ext'; break;
				default: 
					document.forms[0].radFolder.value = 'custom';
					document.forms[0].txtFolder.value = oSettings.customfolder;
			}
		default: /* NA */
	}
	// SubFolder
	document.forms[0].radsubFolder.value = oSettings.subfolder;
	// More to come later
	
	// Privacy
	document.forms[0].radPrivate.value = oSettings.keepprivate;

	// Permissions Error Handling
	document.forms[0].radnoperm.value = oSettings.noperm;
	// Craft permission note (doesn't try to fix a revoked permission)
	browser.permissions.contains({
		permissions: [
			"notifications"
		]
	}).then((result) => {
		if (result === false){
			document.querySelector('input[type="radio"][value="notify"]').setAttribute('perm', 'need-notifications');
			document.getElementById('notifypermnote').textContent = '(Need to grant notifications permission)';
		} else {
			document.querySelector('input[type="radio"][value="notify"]').setAttribute('perm', 'okay');
			document.getElementById('notifypermnote').textContent = '(Permission previously granted)';
		}
	});
}).catch((err) => {
	console.log('Error retrieving "prefs" from storage: '+err.message);
});

/*** Handle User Actions ***/

// Update storage
function updatePref(evt){
	if (evt.target.className != 'savebtn') return;
	// Context menu select's
	var sels = document.querySelectorAll('select[name^="menu"]');
	for (var i=0; i<sels.length; i++){
		oSettings[sels[i].name] = sels[i].value;
	}
	// Font size selects
	sels = document.querySelectorAll('select[name*="fontsize"]');
	for (var i=0; i<sels.length; i++){
		oSettings[sels[i].name] = parseInt(sels[i].value.slice(4));
	}
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		oSettings[chks[i].name] = chks[i].checked;
	}
	// Color scheme
	if (document.forms[0].radColors.value == 'dark') oSettings.btndark = true;
	else oSettings.btndark = false;
	// Save dialog
	switch (document.forms[0].radSaveAs.value){
		case 'yes': oSettings.saveas = 'yes'; break;
		case 'no': oSettings.saveas = 'no'; break;
		default: oSettings.saveas = null;
	}
	// Folder
	if (document.forms[0].radFolder.value == 'default') oSettings.usefolder = false;
	else oSettings.usefolder = true;
	if (document.forms[0].radFolder.value = 'custom' && document.forms[0].txtFolder.value.trim() !=''){
		oSettings.customfolder = document.forms[0].txtFolder.value.trim();
	} else {
		oSettings.customfolder = null;
	}
	// SubFolder
	oSettings.subfolder = document.forms[0].radsubFolder.value;
	// More to come later
	
	// Privacy
	if (document.forms[0].radPrivate.value == 'false') oSettings.keepprivate = false;
	else oSettings.keepprivate = true;

	// Permissions Error Handling
	oSettings.noperm = document.forms[0].radnoperm.value;
	
	// Update storage
	browser.storage.local.set(
		{prefs: oSettings}
	).then(() => {
		// Clean up highlighting
		var lbls = document.querySelectorAll('label');
		for (var i=0; i<lbls.length; i++){
			lbls[i].className = '';
		}
		var btns = document.getElementsByClassName('savebtn');
		for (i=0; i<btns.length; i++){
			btns[i].style.backgroundColor = '';
		}
		evt.target.blur();
		// Send update to background
		browser.runtime.sendMessage({
			update: 'fromStorage'
		});
	}).catch((err) => {
		console.log('Error on browser.storage.local.set(): ' + err.message);
	});
}

function lightSaveBtn(evt){
	if (!['INPUT', 'SELECT'].includes(evt.target.nodeName)) return;
	var chgd = false;
	var frm = evt.target.closest('form');
	switch (evt.target.type){
		case 'checkbox':
			if (evt.target.checked !== oSettings[evt.target.name]){
				evt.target.labels[0].className = 'changed';
			} else {
				evt.target.labels[0].className = '';
			}
			break;
		case 'radio':
			switch (evt.target.name){
				case 'radColors':
					if ((evt.target.value == 'dark') != oSettings.btndark) chgd = true;
					else chgd = false;
					break;
				case 'radFolder':
					switch (evt.target.value){
						case 'default':
							if (oSettings.usefolder == true) chgd = true;
							else chgd = false;
							break;
						case 'ext':
							if (oSettings.usefolder == false || oSettings.customfolder != null) chgd = true;
							else chgd = false;
							break;
						case 'custom':
							if (oSettings.usefolder == false || oSettings.customfolder == null) chgd = true;
							else chgd = false;
							break;
					}
					break;
				case 'radsubFolder':
					switch (evt.target.value){
						case 'none':
							if (oSettings.subfolder != 'none') chgd = true;
							else chgd = false;
							break;
						case 'date':
							if (oSettings.subfolder != 'date') chgd = true;
							else chgd = false;
							break;
						case 'host':
							if (oSettings.subfolder != 'host') chgd = true;
							else chgd = false;
							break;
						case 'img':
							if (oSettings.subfolder != 'img') chgd = true;
							else chgd = false;
							break;
					}
					break;
				case 'radPrivate':
					if (evt.target.value != oSettings.keepprivate.toString()) chgd = true;
					else chgd = false;	
					break;
				case 'radSaveAs':
					if (((evt.target.value == 'omit') && (oSettings.saveas != null)) ||
						((evt.target.value != 'omit') && (evt.target.value != oSettings.saveas))) chgd = true;
					else chgd = false;	
					break;
				case 'radnoperm':
					switch (evt.target.value){
						case 'popup':
							if (oSettings.noperm != 'popup') chgd = true;
							else chgd = false;
							break;
						case 'tab':
							if (oSettings.noperm != 'tab') chgd = true;
							else chgd = false;
							break;
						case 'notify':
							if (oSettings.noperm != 'notify') chgd = true;
							else chgd = false;
							break;
						case 'silent':
							if (oSettings.noperm != 'silent') chgd = true;
							else chgd = false;
							break;
					}
					break;
			}
			if (chgd){
				var rads = frm.querySelectorAll('input[name="' + evt.target.name + '"]');
				for (var i=0; i<rads.length; i++){
					if (rads[i].getAttribute('value') == evt.target.getAttribute('value')) rads[i].labels[0].className = 'changed';
					else rads[i].labels[0].className = '';
				}
			} else {
				var rads = frm.querySelectorAll('input[name="' + evt.target.name + '"]');
				for (var i=0; i<rads.length; i++){
					rads[i].labels[0].className = '';
				}
			}
			break;
		case 'select-one':
			if (evt.target.name.indexOf('menu') > -1){
				if (evt.target.value !== oSettings[evt.target.name]){
					evt.target.labels[0].className = 'changed';
				} else {
					evt.target.labels[0].className = '';
				}
			} else if (evt.target.name.indexOf('fontsize') > -1){
				if (evt.target.value !== 'size' + oSettings[evt.target.name]){
					evt.target.labels[0].className = 'changed';
				} else {
					evt.target.labels[0].className = '';
				}
			}
			break;
		default:
			// none of these 
	}
	var btns = frm.getElementsByClassName('savebtn');
	var changelabels = frm.querySelectorAll('label.changed');
	for (i=0; i<btns.length; i++){
		if (changelabels.length > 0) btns[i].style.backgroundColor = '#ff0';
		else btns[i].style.backgroundColor = '';
	}
}

// Attach event handler to the Save buttons
document.forms[0].addEventListener('click', updatePref, false);
document.forms[0].addEventListener('change', lightSaveBtn, false);

// Optional permission handler
function optionalPerm(evt){
	var toCheck = '';
	switch (evt.target.value){
		case 'notify':
			if (evt.target.checked && evt.target.getAttribute('perm') == 'need-notifications'){
				toCheck = 'notifications';
			}
			break;
		default:
			// WTF?
	}
	if (toCheck == '') return;
	// Request permission
	browser.permissions.request({
		permissions: [
			toCheck
		]
	}).then((result) => {
		if (result === false){
			// revert to saved or default preference value
			if (evt.target.value = 'notify'){
				window.setTimeout(function(){
					document.querySelector('input[type="radio"][value="' + oSettings.noperm + '"]').click();
				}, 100);
			}
		} else {
			evt.target.setAttribute('perm', 'have-notifications');
			document.getElementById('notifypermnote').textContent = '(Permission previously granted)';
		}
	})
}
document.querySelector('input[type="radio"][value="notify"]').addEventListener('change', optionalPerm, false);