/* 
  Save webP as PNG or JPEG - Host Permission Error Page
  Copyright 2024. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 1.5 - Initial design of host permission error options
*/

// Read data passed in the URL
var params = JSON.parse(decodeURI(document.location.search.substring(6)));
var frameUrl = params.frameUrl; // TODO are there any options we can automate for this scenario??
var pageUrl = params.pageUrl;
var srcUrl = params.srcUrl;
var autoclose = !params.keepopen;

/*
if (frameUrl !== '' && frameUrl !== pageUrl) {	// Framed page scenario
	document.querySelector('#framed p:nth-of-type(1)').style.backgroundColor = '#ff0';
	document.querySelector('#general').style.display = 'none';

} else { // non-framed scenarios
*/
	document.querySelector('#framed').style.display = 'none';
	// set up image link URLs
	if (srcUrl !== ''){
		document.getElementById('OpenNewTab').href = srcUrl;
		document.getElementById('OpenNewTab').addEventListener('click', function(evt){
			if (autoclose == true){
				window.setTimeout(function(){
					self.close();
				}, 500)
			}
		}, false);
		var urlWkg = new URL(srcUrl);
		if (urlWkg.protocol == 'http:' || urlWkg.protocol == 'https:'){
			// EZ GIF forms
			document.querySelector('#EzgifPNG + input').value = srcUrl;
			document.getElementById('EzgifPNG').addEventListener('click', function(evt){
				evt.target.closest('form').submit();
				if (autoclose == true){
					window.setTimeout(function(){
						self.close();
					}, 500)
				}
			}, false);
			document.getElementById('EzgifPNG').href = "javascript:void(0)";
			document.querySelector('#EzgifJPG + input').value = srcUrl;
			document.getElementById('EzgifJPG').addEventListener('click', function(evt){
				evt.target.closest('form').submit();
				if (autoclose == true){
					window.setTimeout(function(){
						self.close();
					}, 500)
				}
			}, false);
			document.getElementById('EzgifJPG').href = "javascript:void(0)";
			// Custom parameters for webReqeuest handling
			if (urlWkg.search.length == 0) srcUrl += '?swapjIE11=';
			else srcUrl += '&swapjIE11=';
			document.getElementById('tryAsIE').href = srcUrl;
			document.getElementById('tryAsIE').addEventListener('click', function(evt){
				if (autoclose == true){
					window.setTimeout(function(){
						self.close();
					}, 500)
				}
			}, false);
			document.getElementById('sandboxImage').href = srcUrl.replace('swapjIE11', 'unsandboxcsp');
			document.getElementById('sandboxImage').addEventListener('click', function(evt){
				if (autoclose == true){
					window.setTimeout(function(){
						self.close();
					}, 500)
				}
			}, false);
		}
		
	}
	// set up page link URLs
	if (pageUrl != ''){
		urlWkg = new URL(pageUrl);
		if (urlWkg.hostname !== '') document.getElementById('pagehostname').textContent = ' on ' + urlWkg.hostname;
		if (urlWkg.protocol == 'http:' || urlWkg.protocol == 'https:'){
			if (urlWkg.search.length == 0) urlWkg.search = '?unsandboxcsp=';
			else urlWkg.search += '&unsandboxcsp=';
			document.getElementById('sandboxPage').href = urlWkg.href;
		}
	}
	// disable unpopulated links
	var links = document.querySelectorAll('#general a[href]');
	for (var i=0; i<links.length; i++) if (links[i].href === '') links[i].setAttribute('disabled', 'disabled');
/*
} // End of framed/non-framed scenarios
*/

// Options button
document.getElementById('options').addEventListener('click', function(){
	browser.runtime.openOptionsPage();
	window.setTimeout(function(){
		self.close();
	}, 500)
}, false);
