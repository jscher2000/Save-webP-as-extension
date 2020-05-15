/* Save webP as PNG or JPEG v0.5 */

// Set form values from current preferences
browser.runtime.sendMessage({
	get: "oPrefs"
}).then((response) => {
	var oSettings = response['prefs'];
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
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
	// More to come later
	
	// Privacy
	if (oSettings.keepprivate == true) document.forms[0].radPrivate.value = 'yes';
	else document.forms[0].radPrivate.value = 'no';
}).catch((err) => {
	console.log('Problem getting settings: '+err.message);
});

// Send changes to background for storage
function updatePref(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	var oSettings = {};
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
	// More to come later
	
	// Privacy
	if (document.forms[0].radPrivate.value == 'yes') oSettings.keepprivate = true;
	else oSettings.keepprivate = false;
	
	// Send update to background
	browser.runtime.sendMessage({
		update: oSettings
	});
}
// Attach event handler to the Save button
document.getElementById('btnSave1').addEventListener('click', updatePref, false);
document.getElementById('btnSave2').addEventListener('click', updatePref, false);
document.getElementById('btnSave3').addEventListener('click', updatePref, false);
document.getElementById('btnSave4').addEventListener('click', updatePref, false);
