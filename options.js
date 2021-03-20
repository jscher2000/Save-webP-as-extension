/* 
  Save webP as PNG or JPEG
  Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - fifth try
  version 0.6 - options for menu item behavior, highlight unsaved options page changes
  version 0.7 - enable subfolder, file name, and auto-close options
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
	var sels = document.querySelectorAll('select');
	for (var i=0; i<sels.length; i++){
		var selopt = document.querySelector('select[name="' + sels[i].name + '"] option[value="' + oSettings[sels[i].name] + '"]');
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
}).catch((err) => {
	console.log('Error retrieving "prefs" from storage: '+err.message);
});

/*** Handle User Actions ***/

// Update storage
function updatePref(evt){
	if (evt.target.className != 'savebtn') return;
	// Context menu select's
	var sels = document.querySelectorAll('select');
	for (var i=0; i<sels.length; i++){
		oSettings[sels[i].name] = sels[i].value;
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
	
	// Update storage
	browser.storage.local.set(
		{prefs: oSettings}
	).then(() => {
		// Clean up highlighting
		var lbls = document.querySelectorAll('label');
		for (var i=0; i<lbls.length; i++){
			lbls[i].style.backgroundColor = '';
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
	var chgCount = frm.getAttribute('chgcount');
	switch (evt.target.type){
		case 'checkbox':
			if (evt.target.checked !== oSettings[evt.target.name]){
				chgCount++;
				evt.target.labels[0].style.backgroundColor = '#ff0';
			} else {
				chgCount--;
				evt.target.labels[0].style.backgroundColor = '';
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
			}
			if (chgd){
				chgCount++;
				var rads = frm.querySelectorAll('input[name="' + evt.target.name + '"]');
				for (var i=0; i<rads.length; i++){
					if (rads[i].getAttribute('value') == evt.target.getAttribute('value')) rads[i].labels[0].style.backgroundColor = '#ff0';
					else rads[i].labels[0].style.backgroundColor = '';
				}
			} else {
				chgCount--;
				var rads = frm.querySelectorAll('input[name="' + evt.target.name + '"]');
				for (var i=0; i<rads.length; i++){
					rads[i].labels[0].style.backgroundColor = '';
				}
			}
			break;
		case 'select-one':
			if (evt.target.value !== oSettings[evt.target.name]){
				chgCount++;
				evt.target.labels[0].style.backgroundColor = '#ff0';
			} else {
				chgCount--;
				evt.target.labels[0].style.backgroundColor = '';
			}
			break;
		default:
			// none of these 
	}
	frm.setAttribute('chgcount', chgCount);
	var btns = frm.getElementsByClassName('savebtn');
	for (i=0; i<btns.length; i++){
		if (chgCount > 0) btns[i].style.backgroundColor = '#ff0';
		else btns[i].style.backgroundColor = '';
	}
}

// Attach event handler to the Save buttons
document.forms[0].addEventListener('click', updatePref, false);
document.forms[0].addEventListener('change', lightSaveBtn, false);
