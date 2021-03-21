/* 
  Save webP as PNG or JPEG
  Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.8 - detect stand-alone images and trigger display of button bar
*/

if (document.contentType.indexOf('image/') === 0){
	browser.runtime.sendMessage({
		"standalone": {
			selText: 'body>img'
		}
	});
}
