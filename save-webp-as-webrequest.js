/* 
  Save webP as PNG or JPEG - webRequest Background Script
  Copyright 2024. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 1.0 - Save as IE 11 button
  version 1.5.3 - Updated override for If-None-Match
*/

/**** Redirect and Modify Re-Requests [version 1.0] ****/

// URLs to intercept in various event handlers
var wrTasks = {
	onBefSendHead: [],
	modAccept: [],
	modUA: [],
	onSendHead: [],
	onHeadRecd: []
};

var OBSH_listener, OSH_listener, OHR_listener;

function doRedirect(requestDetails){
	var url = new URL(requestDetails.url);
	var orighref = url.href;
	var srch = url.search;
	if (srch.length > 0){
		var searcharray = url.search.slice(1).split('&');
		if (srch.indexOf('swapjIE11=') > -1){		// To remove image/webp from Accept header
			if (searcharray.length == 1){
				url.search = '';
			} else {
				var viirIndex = searcharray.findIndex((element) => element.indexOf('swapjIE11=') > -1);
				if (viirIndex > -1) {
					searcharray.splice(viirIndex, 1);
					url.search = '?' + searcharray.join('&');
				}
			}
			wrTasks.onBefSendHead.push(url.href);	// To modify Accept header
			wrTasks.modAccept.push(url.href);		// To modify Accept header
			wrTasks.modUA.push(url.href);			// To modify User-Agent header
			//wrTasks.onSendHead.push(url.href);		// DEBUG (to check modified headers)
			wrTasks.onHeadRecd.push(url.href);		// To modify Content-Disposition to attachment
		}

		// Remove and re-add event listener
		browser.webRequest.onBeforeSendHeaders.removeListener(modReqHeaders);
		if (wrTasks.onBefSendHead.length > 0){
			OBSH_listener = browser.webRequest.onBeforeSendHeaders.addListener(
				modReqHeaders,
				{
					urls: wrTasks.onBefSendHead,
					types: ["image", "main_frame"]
				},
				["blocking", "requestHeaders"]
			);
		}
		/*
		browser.webRequest.onSendHeaders.removeListener(repSendHeaders);
		if (wrTasks.onSendHead.length > 0){
			OSH_listener = browser.webRequest.onSendHeaders.addListener(
				repSendHeaders,
				{
					urls: wrTasks.onSendHead,
					types: ["image", "main_frame"]
				},
				["requestHeaders"]
			);
		}
		*/
		browser.webRequest.onHeadersReceived.removeListener(modConDisp);
		if (wrTasks.onHeadRecd.length > 0){
			OHR_listener = browser.webRequest.onHeadersReceived.addListener(
				modConDisp,
				{
					urls: wrTasks.onHeadRecd,
					types: ["image", "main_frame"]
				},
				["blocking", "responseHeaders"]
			);
		}

		if (url.href != orighref) {
			return {
				redirectUrl: url.href
			};
		}
	}
}

// Set up listener to clean the viir parameter from the url so it doesn't hit the server
var urlpatterns = [
	"*://*/*swapjIE11=*"
];

browser.webRequest.onBeforeRequest.addListener(
	doRedirect,
	{
		urls: urlpatterns, 
		types: ["image", "main_frame"] 
	},
	["blocking"]
);

/**** Clean Accept Header and Modify User-Agent for Selected Requests [version 1.0] ****/

function modReqHeaders(details){
	// Accept header
	var taskIndex = wrTasks.modAccept.indexOf(details.url);
	if (taskIndex > -1){
		// Find Accept header and strip image/webp
		for (let header of details.requestHeaders) {
			if (header.name.toLowerCase() === 'accept'){ // old IE 11 Accept for inline images
				header.value = 'image/png, image/svg+xml, image/jxr, image/*; q=0.8, */*; q=0.5';
				break;
			}
		}
		// Purge from modAccept list
		wrTasks.modAccept.splice(taskIndex, 1);
	}
	// User-Agent
	taskIndex = wrTasks.modUA.indexOf(details.url);
	if (taskIndex > -1){
		// Find User-Agent and modify to IE 11
		for (let header of details.requestHeaders) {
			if (header.name.toLowerCase() === 'user-agent'){
				header.value = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';
				break;
			}
		}
		// Purge from modUA list
		wrTasks.modUA.splice(taskIndex, 1);
	}
	// Purge from event tasks
	taskIndex = wrTasks.onBefSendHead.indexOf(details.url);
	if (taskIndex > -1) wrTasks.onBefSendHead.splice(taskIndex, 1);

	// Bypass the cache
	//   Update or add Cache-Control
	var hIndex = details.requestHeaders.findIndex((hdr) => hdr.name.toLowerCase() === 'cache-control');
	if (hIndex > -1){
		// Set value to no-cache
		details.requestHeaders[hIndex].value = 'no-cache';
	} else {
		// Create a new header
		details.requestHeaders.push({
			name: 'Cache-Control',
			value: 'no-cache'
		});
	}
	// Remove If-Modified-Since
	hIndex = details.requestHeaders.findIndex((hdr) => hdr.name.toLowerCase() === 'if-modified-since');
	if (hIndex > -1) details.requestHeaders.splice(hIndex, 1);
	// Override If-None-Match [updated approach in 1.5.3]
	hIndex = details.requestHeaders.findIndex((hdr) => hdr.name.toLowerCase() === 'if-none-match');
	if (hIndex > -1){
		// Set a fake eTag value to prevent 304 response
		details.requestHeaders[hIndex].value = 'asdf';
	} else {
		// Create a new header with a fake eTag value to prevent 304 response
		details.requestHeaders.push({
			name: 'If-None-Match',
			value: 'asdf'
		});
	}

	// Dispatch headers, we're done
	return { requestHeaders: details.requestHeaders };
}

/**** Set Attachment Disposition for Save As Re-Requests [version 1.0] ****/

function modConDisp(details) {
	// Content-Disposition header
	var taskIndex = wrTasks.onHeadRecd.indexOf(details.url);
	if (taskIndex > -1){
		// find the Content-Disposition header if present
		let contentDispositionHeader;
		for (let header of details.responseHeaders) {
			switch (header.name.toLowerCase()) {
				case "content-disposition":
					contentDispositionHeader = header;
					break;
			}
		}
		if (contentDispositionHeader) {
			// Switch inline to attachment
			contentDispositionHeader.value = contentDispositionHeader.value.replace('inline', 'attachment');
		} else {
			// Create a CD header
			details.responseHeaders.push({
				name: 'content-disposition',
				value: 'attachment'
			});
		}

		// Purge from event tasks
		wrTasks.onHeadRecd.splice(taskIndex, 1);
	}
	
	// Dispatch headers, we're done
	return { responseHeaders: details.responseHeaders };
}

// DEBUG ONLY
function repSendHeaders(details){
	console.log('After: ' + JSON.stringify(details.requestHeaders));
	// Purge from event tasks
	taskIndex = wrTasks.onSendHead.indexOf(details.url);
	if (taskIndex > -1) wrTasks.onSendHead.splice(taskIndex, 1);
}
