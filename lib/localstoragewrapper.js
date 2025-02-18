window.saveData = (key, data) => {
	if(!localStorage.savedData) 
		localStorage.savedData = JSON.stringify({});

	const savedData = JSON.parse(localStorage.savedData);
	const type = typeof data;
	savedData[key] = {
		type,
		data: (type === 'object') ? JSON.stringify(data) : data
	};
	localStorage.savedData = JSON.stringify(savedData);
}

window.getData = key => {
	const savedData = JSON.parse(localStorage.savedData);
	if(savedData[key] !== undefined) {
		const value = savedData[key];
		if(value.type === 'number') {
			return parseFloat(value.data)
		} else if (value.type === 'string') {
			return value.data;
		} else if (value.type === 'object') {
			return JSON.parse(value.data);
		}
	} else {
		throw (new Error(`${key} does not exist in saved data.`))
	}
}
