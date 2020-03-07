import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import strip from '@rollup/plugin-strip';
import { terser } from "rollup-plugin-terser";

var environment = process.env.ENV || 'development';
var isDevelopmentEnv = (environment === 'development');

export default {
	input: "src/datafeed.js",
	output: {
		file: "dist/bundle.js",
		name: "datafeed",
		format: "umd"
	},
	plugins: [
		strip({
			functions: ["console.log"]
		}),
		resolve({ main: true }),
		buble(),
		!isDevelopmentEnv && terser(),
		
	],
};