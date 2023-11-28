import {parseScript} from './dist/src/meriyah.mjs';
import fs from 'fs'
const sourceFile = fs.readFileSync('./src.js', 'utf8')

console.log(parseScript(sourceFile).body[0].expression.right.properties)