import test from "node:test";
import assert from "node:assert/strict";
import {locales,messages} from "../src/i18n";
test("English, French and Swahili have the same nonempty public translation keys",()=>{
 const keys=Object.keys(messages.en).sort();
 for(const locale of locales){assert.deepEqual(Object.keys(messages[locale]).sort(),keys);for(const key of keys){const value=messages[locale][key as keyof typeof messages.en];assert.equal(typeof value,"string");assert.ok(value.trim(),`${locale}.${key} is empty`)}}
});
