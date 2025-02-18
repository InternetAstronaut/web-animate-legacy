// https://github.com/zz85/timeliner/blob/master/src/utils.js

function applyStyle({style}, var_args) {
	for (let i = 1; i < arguments.length; ++i) {
		const styles = arguments[i];
		for (const s in styles) {
			style[s] = styles[s];
		}
	}
}