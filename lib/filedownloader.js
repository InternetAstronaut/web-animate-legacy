 const FileDownloader = (() => {

	const fileDownloader = { };

	fileDownloader.downloadFile = url => {
		let fileString = "";
		const rawFile = new XMLHttpRequest();
		rawFile.open("GET", url, false);
		rawFile.onreadystatechange = () => {
			if(rawFile.readyState === 4) {
				if(rawFile.status === 200 || rawFile.status == 0) {
					fileString = rawFile.responseText;
				}
			}
		}
		rawFile.send(null);
		return fileString;
	}

	return fileDownloader;

})();