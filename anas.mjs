import {parseScript} from './dist/src/meriyah.mjs';
console.log(parseScript("x={.....:5}").body[0].expression.right.properties[0]);


