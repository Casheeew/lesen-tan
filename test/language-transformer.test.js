/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import fs from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {describe, expect, test} from 'vitest';
import {parseJson} from '../dev/json.js';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {LanguageTransformer} languageTransformer
 * @param {string} source
 * @param {string} expectedTerm
 * @param {string|null} expectedConditionName
 * @param {string[]|null} expectedReasons
 * @returns {{has: false, reasons: null, rules: null}|{has: true, reasons: string[], rules: number}}
 */
function hasTermReasons(languageTransformer, source, expectedTerm, expectedConditionName, expectedReasons) {
    for (const {text, conditions, trace} of languageTransformer.transform(source)) {
        if (text !== expectedTerm) { continue; }
        if (expectedConditionName !== null) {
            const expectedConditions = languageTransformer.getConditionFlagsFromConditionType(expectedConditionName);
            if (!LanguageTransformer.conditionsMatch(conditions, expectedConditions)) { continue; }
        }
        let okay = true;
        if (expectedReasons !== null) {
            if (trace.length !== expectedReasons.length) { continue; }
            for (let i = 0, ii = expectedReasons.length; i < ii; ++i) {
                if (expectedReasons[i] !== trace[i].transform) {
                    okay = false;
                    break;
                }
            }
        }
        if (okay) {
            return {
                has: true,
                reasons: trace.map((frame) => frame.transform),
                rules: conditions
            };
        }
    }
    return {has: false, reasons: null, rules: null};
}


/** */
function testDeinflections() {
    /* eslint-disable no-multi-spaces */
    const data = [
        {
            category: 'adjectives',
            valid: true,
            tests: [
                {term: '愛しい', source: '愛しい',                 rule: 'adj-i', reasons: []},
                {term: '愛しい', source: '愛しそう',               rule: 'adj-i', reasons: ['-sou']},
                {term: '愛しい', source: '愛しすぎる',             rule: 'adj-i', reasons: ['-sugiru']},
                {term: '愛しい', source: '愛しかったら',           rule: 'adj-i', reasons: ['-tara']},
                {term: '愛しい', source: '愛しかったり',           rule: 'adj-i', reasons: ['-tari']},
                {term: '愛しい', source: '愛しくて',               rule: 'adj-i', reasons: ['-te']},
                {term: '愛しい', source: '愛しく',                 rule: 'adj-i', reasons: ['adv']},
                {term: '愛しい', source: '愛しくない',             rule: 'adj-i', reasons: ['negative']},
                {term: '愛しい', source: '愛しさ',                 rule: 'adj-i', reasons: ['noun']},
                {term: '愛しい', source: '愛しかった',             rule: 'adj-i', reasons: ['past']},
                {term: '愛しい', source: '愛しくありません',      rule: 'adj-i', reasons: ['polite negative']},
                {term: '愛しい', source: '愛しくありませんでした', rule: 'adj-i', reasons: ['polite past negative']},
                {term: '愛しい', source: '愛しき',                 rule: 'adj-i', reasons: ['-ki']},
                {term: '愛しい', source: '愛しげ',                 rule: 'adj-i', reasons: ['-ge']}
            ]
        },
        {
            category: 'ichidan verbs',
            valid: true,
            tests: [
                {term: '食べる', source: '食べる',           rule: 'v1', reasons: []},
                {term: '食べる', source: '食べます',         rule: 'v1', reasons: ['polite']},
                {term: '食べる', source: '食べた',           rule: 'v1', reasons: ['past']},
                {term: '食べる', source: '食べました',       rule: 'v1', reasons: ['polite past']},
                {term: '食べる', source: '食べて',           rule: 'v1', reasons: ['-te']},
                {term: '食べる', source: '食べられる',       rule: 'v1', reasons: ['potential or passive']},
                {term: '食べる', source: '食べられる',       rule: 'v1', reasons: ['potential or passive']},
                {term: '食べる', source: '食べさせる',       rule: 'v1', reasons: ['causative']},
                {term: '食べる', source: '食べさせられる',   rule: 'v1', reasons: ['causative', 'potential or passive']},
                {term: '食べる', source: '食べろ',           rule: 'v1', reasons: ['imperative']},
                {term: '食べる', source: '食べない',         rule: 'v1', reasons: ['negative']},
                {term: '食べる', source: '食べません',       rule: 'v1', reasons: ['polite negative']},
                {term: '食べる', source: '食べなかった',     rule: 'v1', reasons: ['negative', 'past']},
                {term: '食べる', source: '食べませんでした', rule: 'v1', reasons: ['polite past negative']},
                {term: '食べる', source: '食べなくて',       rule: 'v1', reasons: ['negative', '-te']},
                {term: '食べる', source: '食べられない',     rule: 'v1', reasons: ['potential or passive', 'negative']},
                {term: '食べる', source: '食べられない',     rule: 'v1', reasons: ['potential or passive', 'negative']},
                {term: '食べる', source: '食べさせない',     rule: 'v1', reasons: ['causative', 'negative']},
                {term: '食べる', source: '食べさせられない', rule: 'v1', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '食べる', source: '食べるな',         rule: 'v1', reasons: ['imperative negative']},

                {term: '食べる', source: '食べれば',         rule: 'v1', reasons: ['-ba']},
                {term: '食べる', source: '食べちゃう',       rule: 'v1', reasons: ['-chau']},
                {term: '食べる', source: '食べちまう',       rule: 'v1', reasons: ['-chimau']},
                {term: '食べる', source: '食べなさい',       rule: 'v1', reasons: ['-nasai']},
                {term: '食べる', source: '食べそう',         rule: 'v1', reasons: ['-sou']},
                {term: '食べる', source: '食べすぎる',       rule: 'v1', reasons: ['-sugiru']},
                {term: '食べる', source: '食べたい',         rule: 'v1', reasons: ['-tai']},
                {term: '食べる', source: '食べたら',         rule: 'v1', reasons: ['-tara']},
                {term: '食べる', source: '食べたり',         rule: 'v1', reasons: ['-tari']},
                {term: '食べる', source: '食べず',           rule: 'v1', reasons: ['-zu']},
                {term: '食べる', source: '食べぬ',           rule: 'v1', reasons: ['-nu']},
                {term: '食べる', source: '食べざる',           rule: 'v1', reasons: ['-zaru']},
                {term: '食べる', source: '食べねば',           rule: 'v1', reasons: ['-neba']},
                {term: '食べる', source: '食べ',             rule: 'v1d', reasons: ['masu stem']},
                {term: '食べる', source: '食べましょう',     rule: 'v1', reasons: ['polite volitional']},
                {term: '食べる', source: '食べよう',         rule: 'v1', reasons: ['volitional']},
                // ['causative passive']
                {term: '食べる', source: '食べとく',         rule: 'v1', reasons: ['-toku']},
                {term: '食べる', source: '食べている',       rule: 'v1', reasons: ['-te', 'progressive or perfect']},
                {term: '食べる', source: '食べておる',       rule: 'v1', reasons: ['-te', 'progressive or perfect']},
                {term: '食べる', source: '食べてる',         rule: 'v1', reasons: ['-te', 'progressive or perfect']},
                {term: '食べる', source: '食べとる',         rule: 'v1', reasons: ['-te', 'progressive or perfect']},
                {term: '食べる', source: '食べてしまう',     rule: 'v1', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-u verbs',
            valid: true,
            tests: [
                {term: '買う', source: '買う',             rule: 'v5', reasons: []},
                {term: '買う', source: '買います',         rule: 'v5', reasons: ['polite']},
                {term: '買う', source: '買った',           rule: 'v5', reasons: ['past']},
                {term: '買う', source: '買いました',       rule: 'v5', reasons: ['polite past']},
                {term: '買う', source: '買って',           rule: 'v5', reasons: ['-te']},
                {term: '買う', source: '買える',           rule: 'v5', reasons: ['potential']},
                {term: '買う', source: '買われる',         rule: 'v5', reasons: ['passive']},
                {term: '買う', source: '買わせる',         rule: 'v5', reasons: ['causative']},
                {term: '買う', source: '買わせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '買う', source: '買え',             rule: 'v5', reasons: ['imperative']},
                {term: '買う', source: '買わない',         rule: 'v5', reasons: ['negative']},
                {term: '買う', source: '買いません',       rule: 'v5', reasons: ['polite negative']},
                {term: '買う', source: '買わなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '買う', source: '買いませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '買う', source: '買わなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '買う', source: '買えない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '買う', source: '買われない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '買う', source: '買わせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '買う', source: '買わせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '買う', source: '買うな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '買う', source: '買えば',           rule: 'v5', reasons: ['-ba']},
                {term: '買う', source: '買っちゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '買う', source: '買っちまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '買う', source: '買いなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '買う', source: '買いそう',         rule: 'v5', reasons: ['-sou']},
                {term: '買う', source: '買いすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '買う', source: '買いたい',         rule: 'v5', reasons: ['-tai']},
                {term: '買う', source: '買ったら',         rule: 'v5', reasons: ['-tara']},
                {term: '買う', source: '買ったり',         rule: 'v5', reasons: ['-tari']},
                {term: '買う', source: '買わず',           rule: 'v5', reasons: ['-zu']},
                {term: '買う', source: '買わぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '買う', source: '買わざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '買う', source: '買わねば',           rule: 'v5', reasons: ['-neba']},
                {term: '買う', source: '買い',             rule: 'v5', reasons: ['masu stem']},
                {term: '買う', source: '買いましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '買う', source: '買おう',           rule: 'v5', reasons: ['volitional']},
                {term: '買う', source: '買わされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '買う', source: '買っとく',         rule: 'v5', reasons: ['-toku']},
                {term: '買う', source: '買っている',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '買う', source: '買っておる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '買う', source: '買ってる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '買う', source: '買っとる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '買う', source: '買ってしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-ku verbs',
            valid: true,
            tests: [
                {term: '行く', source: '行く',             rule: 'v5', reasons: []},
                {term: '行く', source: '行きます',         rule: 'v5', reasons: ['polite']},
                {term: '行く', source: '行った',           rule: 'v5', reasons: ['past']},
                {term: '行く', source: '行きました',       rule: 'v5', reasons: ['polite past']},
                {term: '行く', source: '行って',           rule: 'v5', reasons: ['-te']},
                {term: '行く', source: '行ける',           rule: 'v5', reasons: ['potential']},
                {term: '行く', source: '行かれる',         rule: 'v5', reasons: ['passive']},
                {term: '行く', source: '行かせる',         rule: 'v5', reasons: ['causative']},
                {term: '行く', source: '行かせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '行く', source: '行け',             rule: 'v5', reasons: ['imperative']},
                {term: '行く', source: '行かない',         rule: 'v5', reasons: ['negative']},
                {term: '行く', source: '行きません',       rule: 'v5', reasons: ['polite negative']},
                {term: '行く', source: '行かなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '行く', source: '行きませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '行く', source: '行かなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '行く', source: '行けない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '行く', source: '行かれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '行く', source: '行かせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '行く', source: '行かせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '行く', source: '行くな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '行く', source: '行けば',           rule: 'v5', reasons: ['-ba']},
                {term: '行く', source: '行っちゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '行く', source: '行っちまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '行く', source: '行きなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '行く', source: '行きそう',         rule: 'v5', reasons: ['-sou']},
                {term: '行く', source: '行きすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '行く', source: '行きたい',         rule: 'v5', reasons: ['-tai']},
                {term: '行く', source: '行いたら',         rule: 'v5', reasons: ['-tara']},
                {term: '行く', source: '行いたり',         rule: 'v5', reasons: ['-tari']},
                {term: '行く', source: '行かず',           rule: 'v5', reasons: ['-zu']},
                {term: '行く', source: '行かぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '行く', source: '行かざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '行く', source: '行かねば',           rule: 'v5', reasons: ['-neba']},
                {term: '行く', source: '行き',             rule: 'v5', reasons: ['masu stem']},
                {term: '行く', source: '行きましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '行く', source: '行こう',           rule: 'v5', reasons: ['volitional']},
                {term: '行く', source: '行かされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '行く', source: '行いとく',         rule: 'v5', reasons: ['-toku']},
                {term: '行く', source: '行っている',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '行く', source: '行っておる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '行く', source: '行ってる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '行く', source: '行っとる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '行く', source: '行ってしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-gu verbs',
            valid: true,
            tests: [
                {term: '泳ぐ', source: '泳ぐ',             rule: 'v5', reasons: []},
                {term: '泳ぐ', source: '泳ぎます',         rule: 'v5', reasons: ['polite']},
                {term: '泳ぐ', source: '泳いだ',           rule: 'v5', reasons: ['past']},
                {term: '泳ぐ', source: '泳ぎました',       rule: 'v5', reasons: ['polite past']},
                {term: '泳ぐ', source: '泳いで',           rule: 'v5', reasons: ['-te']},
                {term: '泳ぐ', source: '泳げる',           rule: 'v5', reasons: ['potential']},
                {term: '泳ぐ', source: '泳がれる',         rule: 'v5', reasons: ['passive']},
                {term: '泳ぐ', source: '泳がせる',         rule: 'v5', reasons: ['causative']},
                {term: '泳ぐ', source: '泳がせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '泳ぐ', source: '泳げ',             rule: 'v5', reasons: ['imperative']},
                {term: '泳ぐ', source: '泳がない',         rule: 'v5', reasons: ['negative']},
                {term: '泳ぐ', source: '泳ぎません',       rule: 'v5', reasons: ['polite negative']},
                {term: '泳ぐ', source: '泳がなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '泳ぐ', source: '泳ぎませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '泳ぐ', source: '泳がなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '泳ぐ', source: '泳げない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '泳ぐ', source: '泳がれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '泳ぐ', source: '泳がせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '泳ぐ', source: '泳がせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '泳ぐ', source: '泳ぐな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '泳ぐ', source: '泳げば',           rule: 'v5', reasons: ['-ba']},
                {term: '泳ぐ', source: '泳いじゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '泳ぐ', source: '泳いじまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '泳ぐ', source: '泳ぎなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '泳ぐ', source: '泳ぎそう',         rule: 'v5', reasons: ['-sou']},
                {term: '泳ぐ', source: '泳ぎすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '泳ぐ', source: '泳ぎたい',         rule: 'v5', reasons: ['-tai']},
                {term: '泳ぐ', source: '泳いだら',         rule: 'v5', reasons: ['-tara']},
                {term: '泳ぐ', source: '泳いだり',         rule: 'v5', reasons: ['-tari']},
                {term: '泳ぐ', source: '泳がず',           rule: 'v5', reasons: ['-zu']},
                {term: '泳ぐ', source: '泳がぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '泳ぐ', source: '泳がざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '泳ぐ', source: '泳がねば',           rule: 'v5', reasons: ['-neba']},
                {term: '泳ぐ', source: '泳ぎ',             rule: 'v5', reasons: ['masu stem']},
                {term: '泳ぐ', source: '泳ぎましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '泳ぐ', source: '泳ごう',           rule: 'v5', reasons: ['volitional']},
                {term: '泳ぐ', source: '泳がされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '泳ぐ', source: '泳いどく',         rule: 'v5', reasons: ['-toku']},
                {term: '泳ぐ', source: '泳いでいる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '泳ぐ', source: '泳いでおる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '泳ぐ', source: '泳いでる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '泳ぐ', source: '泳いでしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-su verbs',
            valid: true,
            tests: [
                {term: '話す', source: '話す',             rule: 'v5', reasons: []},
                {term: '話す', source: '話します',         rule: 'v5', reasons: ['polite']},
                {term: '話す', source: '話した',           rule: 'v5', reasons: ['past']},
                {term: '話す', source: '話しました',       rule: 'v5', reasons: ['polite past']},
                {term: '話す', source: '話して',           rule: 'v5', reasons: ['-te']},
                {term: '話す', source: '話せる',           rule: 'v5', reasons: ['potential']},
                {term: '話す', source: '話される',         rule: 'v5', reasons: ['passive']},
                {term: '話す', source: '話させる',         rule: 'v5', reasons: ['causative']},
                {term: '話す', source: '話させられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '話す', source: '話せ',             rule: 'v5', reasons: ['imperative']},
                {term: '話す', source: '話さない',         rule: 'v5', reasons: ['negative']},
                {term: '話す', source: '話しません',       rule: 'v5', reasons: ['polite negative']},
                {term: '話す', source: '話さなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '話す', source: '話しませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '話す', source: '話さなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '話す', source: '話せない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '話す', source: '話されない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '話す', source: '話させない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '話す', source: '話させられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '話す', source: '話すな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '話す', source: '話せば',           rule: 'v5', reasons: ['-ba']},
                {term: '話す', source: '話しちゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '話す', source: '話しちまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '話す', source: '話しなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '話す', source: '話しそう',         rule: 'v5', reasons: ['-sou']},
                {term: '話す', source: '話しすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '話す', source: '話したい',         rule: 'v5', reasons: ['-tai']},
                {term: '話す', source: '話したら',         rule: 'v5', reasons: ['-tara']},
                {term: '話す', source: '話したり',         rule: 'v5', reasons: ['-tari']},
                {term: '話す', source: '話さず',           rule: 'v5', reasons: ['-zu']},
                {term: '話す', source: '話さぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '話す', source: '話さざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '話す', source: '話さねば',           rule: 'v5', reasons: ['-neba']},
                {term: '話す', source: '話し',             rule: 'v5', reasons: ['masu stem']},
                {term: '話す', source: '話しましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '話す', source: '話そう',           rule: 'v5', reasons: ['volitional']},
                // ['causative passive']
                {term: '話す', source: '話しとく',         rule: 'v5', reasons: ['-toku']},
                {term: '話す', source: '話している',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '話す', source: '話しておる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '話す', source: '話してる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '話す', source: '話しとる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '話す', source: '話してしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-tsu verbs',
            valid: true,
            tests: [
                {term: '待つ', source: '待つ',             rule: 'v5', reasons: []},
                {term: '待つ', source: '待ちます',         rule: 'v5', reasons: ['polite']},
                {term: '待つ', source: '待った',           rule: 'v5', reasons: ['past']},
                {term: '待つ', source: '待ちました',       rule: 'v5', reasons: ['polite past']},
                {term: '待つ', source: '待って',           rule: 'v5', reasons: ['-te']},
                {term: '待つ', source: '待てる',           rule: 'v5', reasons: ['potential']},
                {term: '待つ', source: '待たれる',         rule: 'v5', reasons: ['passive']},
                {term: '待つ', source: '待たせる',         rule: 'v5', reasons: ['causative']},
                {term: '待つ', source: '待たせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '待つ', source: '待て',             rule: 'v5', reasons: ['imperative']},
                {term: '待つ', source: '待たない',         rule: 'v5', reasons: ['negative']},
                {term: '待つ', source: '待ちません',       rule: 'v5', reasons: ['polite negative']},
                {term: '待つ', source: '待たなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '待つ', source: '待ちませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '待つ', source: '待たなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '待つ', source: '待てない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '待つ', source: '待たれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '待つ', source: '待たせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '待つ', source: '待たせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '待つ', source: '待つな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '待つ', source: '待てば',           rule: 'v5', reasons: ['-ba']},
                {term: '待つ', source: '待っちゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '待つ', source: '待っちまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '待つ', source: '待ちなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '待つ', source: '待ちそう',         rule: 'v5', reasons: ['-sou']},
                {term: '待つ', source: '待ちすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '待つ', source: '待ちたい',         rule: 'v5', reasons: ['-tai']},
                {term: '待つ', source: '待ったら',         rule: 'v5', reasons: ['-tara']},
                {term: '待つ', source: '待ったり',         rule: 'v5', reasons: ['-tari']},
                {term: '待つ', source: '待たず',           rule: 'v5', reasons: ['-zu']},
                {term: '待つ', source: '待たぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '待つ', source: '待たざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '待つ', source: '待たねば',           rule: 'v5', reasons: ['-neba']},
                {term: '待つ', source: '待ち',             rule: 'v5', reasons: ['masu stem']},
                {term: '待つ', source: '待ちましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '待つ', source: '待とう',           rule: 'v5', reasons: ['volitional']},
                {term: '待つ', source: '待たされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '待つ', source: '待っとく',         rule: 'v5', reasons: ['-toku']},
                {term: '待つ', source: '待っている',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '待つ', source: '待っておる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '待つ', source: '待ってる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '待つ', source: '待っとる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '待つ', source: '待ってしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-nu verbs',
            valid: true,
            tests: [
                {term: '死ぬ', source: '死ぬ',             rule: 'v5', reasons: []},
                {term: '死ぬ', source: '死にます',         rule: 'v5', reasons: ['polite']},
                {term: '死ぬ', source: '死んだ',           rule: 'v5', reasons: ['past']},
                {term: '死ぬ', source: '死にました',       rule: 'v5', reasons: ['polite past']},
                {term: '死ぬ', source: '死んで',           rule: 'v5', reasons: ['-te']},
                {term: '死ぬ', source: '死ねる',           rule: 'v5', reasons: ['potential']},
                {term: '死ぬ', source: '死なれる',         rule: 'v5', reasons: ['passive']},
                {term: '死ぬ', source: '死なせる',         rule: 'v5', reasons: ['causative']},
                {term: '死ぬ', source: '死なせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '死ぬ', source: '死ね',             rule: 'v5', reasons: ['imperative']},
                {term: '死ぬ', source: '死なない',         rule: 'v5', reasons: ['negative']},
                {term: '死ぬ', source: '死にません',       rule: 'v5', reasons: ['polite negative']},
                {term: '死ぬ', source: '死ななかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '死ぬ', source: '死にませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '死ぬ', source: '死ななくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '死ぬ', source: '死ねない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '死ぬ', source: '死なれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '死ぬ', source: '死なせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '死ぬ', source: '死なせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '死ぬ', source: '死ぬな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '死ぬ', source: '死ねば',           rule: 'v5', reasons: ['-ba']},
                {term: '死ぬ', source: '死んじゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '死ぬ', source: '死んじまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '死ぬ', source: '死になさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '死ぬ', source: '死にそう',         rule: 'v5', reasons: ['-sou']},
                {term: '死ぬ', source: '死にすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '死ぬ', source: '死にたい',         rule: 'v5', reasons: ['-tai']},
                {term: '死ぬ', source: '死んだら',         rule: 'v5', reasons: ['-tara']},
                {term: '死ぬ', source: '死んだり',         rule: 'v5', reasons: ['-tari']},
                {term: '死ぬ', source: '死なず',           rule: 'v5', reasons: ['-zu']},
                {term: '死ぬ', source: '死なぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '死ぬ', source: '死なざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '死ぬ', source: '死なねば',           rule: 'v5', reasons: ['-neba']},
                {term: '死ぬ', source: '死に',             rule: 'v5', reasons: ['masu stem']},
                {term: '死ぬ', source: '死にましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '死ぬ', source: '死のう',           rule: 'v5', reasons: ['volitional']},
                {term: '死ぬ', source: '死なされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '死ぬ', source: '死んどく',         rule: 'v5', reasons: ['-toku']},
                {term: '死ぬ', source: '死んでいる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '死ぬ', source: '死んでおる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '死ぬ', source: '死んでる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '死ぬ', source: '死んでしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-bu verbs',
            valid: true,
            tests: [
                {term: '遊ぶ', source: '遊ぶ',             rule: 'v5', reasons: []},
                {term: '遊ぶ', source: '遊びます',         rule: 'v5', reasons: ['polite']},
                {term: '遊ぶ', source: '遊んだ',           rule: 'v5', reasons: ['past']},
                {term: '遊ぶ', source: '遊びました',       rule: 'v5', reasons: ['polite past']},
                {term: '遊ぶ', source: '遊んで',           rule: 'v5', reasons: ['-te']},
                {term: '遊ぶ', source: '遊べる',           rule: 'v5', reasons: ['potential']},
                {term: '遊ぶ', source: '遊ばれる',         rule: 'v5', reasons: ['passive']},
                {term: '遊ぶ', source: '遊ばせる',         rule: 'v5', reasons: ['causative']},
                {term: '遊ぶ', source: '遊ばせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '遊ぶ', source: '遊べ',             rule: 'v5', reasons: ['imperative']},
                {term: '遊ぶ', source: '遊ばない',         rule: 'v5', reasons: ['negative']},
                {term: '遊ぶ', source: '遊びません',       rule: 'v5', reasons: ['polite negative']},
                {term: '遊ぶ', source: '遊ばなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '遊ぶ', source: '遊びませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '遊ぶ', source: '遊ばなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '遊ぶ', source: '遊べない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '遊ぶ', source: '遊ばれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '遊ぶ', source: '遊ばせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '遊ぶ', source: '遊ばせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '遊ぶ', source: '遊ぶな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '遊ぶ', source: '遊べば',           rule: 'v5', reasons: ['-ba']},
                {term: '遊ぶ', source: '遊んじゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '遊ぶ', source: '遊んじまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '遊ぶ', source: '遊びなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '遊ぶ', source: '遊びそう',         rule: 'v5', reasons: ['-sou']},
                {term: '遊ぶ', source: '遊びすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '遊ぶ', source: '遊びたい',         rule: 'v5', reasons: ['-tai']},
                {term: '遊ぶ', source: '遊んだら',         rule: 'v5', reasons: ['-tara']},
                {term: '遊ぶ', source: '遊んだり',         rule: 'v5', reasons: ['-tari']},
                {term: '遊ぶ', source: '遊ばず',           rule: 'v5', reasons: ['-zu']},
                {term: '遊ぶ', source: '遊ばぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '遊ぶ', source: '遊ばざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '遊ぶ', source: '遊ばねば',           rule: 'v5', reasons: ['-neba']},
                {term: '遊ぶ', source: '遊び',             rule: 'v5', reasons: ['masu stem']},
                {term: '遊ぶ', source: '遊びましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '遊ぶ', source: '遊ぼう',           rule: 'v5', reasons: ['volitional']},
                {term: '遊ぶ', source: '遊ばされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '遊ぶ', source: '遊んどく',         rule: 'v5', reasons: ['-toku']},
                {term: '遊ぶ', source: '遊んでいる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '遊ぶ', source: '遊んでおる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '遊ぶ', source: '遊んでる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '遊ぶ', source: '遊んでしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-mu verbs',
            valid: true,
            tests: [
                {term: '飲む', source: '飲む',             rule: 'v5', reasons: []},
                {term: '飲む', source: '飲みます',         rule: 'v5', reasons: ['polite']},
                {term: '飲む', source: '飲んだ',           rule: 'v5', reasons: ['past']},
                {term: '飲む', source: '飲みました',       rule: 'v5', reasons: ['polite past']},
                {term: '飲む', source: '飲んで',           rule: 'v5', reasons: ['-te']},
                {term: '飲む', source: '飲める',           rule: 'v5', reasons: ['potential']},
                {term: '飲む', source: '飲まれる',         rule: 'v5', reasons: ['passive']},
                {term: '飲む', source: '飲ませる',         rule: 'v5', reasons: ['causative']},
                {term: '飲む', source: '飲ませられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '飲む', source: '飲め',             rule: 'v5', reasons: ['imperative']},
                {term: '飲む', source: '飲まない',         rule: 'v5', reasons: ['negative']},
                {term: '飲む', source: '飲みません',       rule: 'v5', reasons: ['polite negative']},
                {term: '飲む', source: '飲まなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '飲む', source: '飲みませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '飲む', source: '飲まなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '飲む', source: '飲めない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '飲む', source: '飲まれない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '飲む', source: '飲ませない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '飲む', source: '飲ませられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '飲む', source: '飲むな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '飲む', source: '飲めば',           rule: 'v5', reasons: ['-ba']},
                {term: '飲む', source: '飲んじゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '飲む', source: '飲んじまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '飲む', source: '飲みなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '飲む', source: '飲みそう',         rule: 'v5', reasons: ['-sou']},
                {term: '飲む', source: '飲みすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '飲む', source: '飲みたい',         rule: 'v5', reasons: ['-tai']},
                {term: '飲む', source: '飲んだら',         rule: 'v5', reasons: ['-tara']},
                {term: '飲む', source: '飲んだり',         rule: 'v5', reasons: ['-tari']},
                {term: '飲む', source: '飲まず',           rule: 'v5', reasons: ['-zu']},
                {term: '飲む', source: '飲まぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '飲む', source: '飲まざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '飲む', source: '飲まねば',           rule: 'v5', reasons: ['-neba']},
                {term: '飲む', source: '飲み',             rule: 'v5', reasons: ['masu stem']},
                {term: '飲む', source: '飲みましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '飲む', source: '飲もう',           rule: 'v5', reasons: ['volitional']},
                {term: '飲む', source: '飲まされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '飲む', source: '飲んどく',         rule: 'v5', reasons: ['-toku']},
                {term: '飲む', source: '飲んでいる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '飲む', source: '飲んでおる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '飲む', source: '飲んでる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '飲む', source: '飲んでしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: 'godan verbs',
            valid: true,
            tests: [
                {term: '作る', source: '作る',             rule: 'v5', reasons: []},
                {term: '作る', source: '作ります',         rule: 'v5', reasons: ['polite']},
                {term: '作る', source: '作った',           rule: 'v5', reasons: ['past']},
                {term: '作る', source: '作りました',       rule: 'v5', reasons: ['polite past']},
                {term: '作る', source: '作って',           rule: 'v5', reasons: ['-te']},
                {term: '作る', source: '作れる',           rule: 'v5', reasons: ['potential']},
                {term: '作る', source: '作られる',         rule: 'v5', reasons: ['passive']},
                {term: '作る', source: '作らせる',         rule: 'v5', reasons: ['causative']},
                {term: '作る', source: '作らせられる',     rule: 'v5', reasons: ['causative', 'potential or passive']},
                {term: '作る', source: '作れ',             rule: 'v5', reasons: ['imperative']},
                {term: '作る', source: '作らない',         rule: 'v5', reasons: ['negative']},
                {term: '作る', source: '作りません',       rule: 'v5', reasons: ['polite negative']},
                {term: '作る', source: '作らなかった',     rule: 'v5', reasons: ['negative', 'past']},
                {term: '作る', source: '作りませんでした', rule: 'v5', reasons: ['polite past negative']},
                {term: '作る', source: '作らなくて',       rule: 'v5', reasons: ['negative', '-te']},
                {term: '作る', source: '作れない',         rule: 'v5', reasons: ['potential', 'negative']},
                {term: '作る', source: '作られない',       rule: 'v5', reasons: ['passive', 'negative']},
                {term: '作る', source: '作らせない',       rule: 'v5', reasons: ['causative', 'negative']},
                {term: '作る', source: '作らせられない',   rule: 'v5', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '作る', source: '作るな',           rule: 'v5', reasons: ['imperative negative']},

                {term: '作る', source: '作れば',           rule: 'v5', reasons: ['-ba']},
                {term: '作る', source: '作っちゃう',       rule: 'v5', reasons: ['-chau']},
                {term: '作る', source: '作っちまう',       rule: 'v5', reasons: ['-chimau']},
                {term: '作る', source: '作りなさい',       rule: 'v5', reasons: ['-nasai']},
                {term: '作る', source: '作りそう',         rule: 'v5', reasons: ['-sou']},
                {term: '作る', source: '作りすぎる',       rule: 'v5', reasons: ['-sugiru']},
                {term: '作る', source: '作りたい',         rule: 'v5', reasons: ['-tai']},
                {term: '作る', source: '作ったら',         rule: 'v5', reasons: ['-tara']},
                {term: '作る', source: '作ったり',         rule: 'v5', reasons: ['-tari']},
                {term: '作る', source: '作らず',           rule: 'v5', reasons: ['-zu']},
                {term: '作る', source: '作らぬ',           rule: 'v5', reasons: ['-nu']},
                {term: '作る', source: '作らざる',           rule: 'v5', reasons: ['-zaru']},
                {term: '作る', source: '作らねば',           rule: 'v5', reasons: ['-neba']},
                {term: '作る', source: '作り',             rule: 'v5', reasons: ['masu stem']},
                {term: '作る', source: '作りましょう',     rule: 'v5', reasons: ['polite volitional']},
                {term: '作る', source: '作ろう',           rule: 'v5', reasons: ['volitional']},
                {term: '作る', source: '作らされる',       rule: 'v5', reasons: ['causative passive']},
                {term: '作る', source: '作っとく',         rule: 'v5', reasons: ['-toku']},
                {term: '作る', source: '作っている',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '作る', source: '作っておる',       rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '作る', source: '作ってる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '作る', source: '作っとる',         rule: 'v5', reasons: ['-te', 'progressive or perfect']},
                {term: '作る', source: '作ってしまう',     rule: 'v5', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: 'irregular verbs',
            valid: true,
            tests: [
                {term: '為る', source: '為る',           rule: 'vs', reasons: []},
                {term: '為る', source: '為ます',         rule: 'vs', reasons: ['polite']},
                {term: '為る', source: '為た',           rule: 'vs', reasons: ['past']},
                {term: '為る', source: '為ました',       rule: 'vs', reasons: ['polite past']},
                {term: '為る', source: '為て',           rule: 'vs', reasons: ['-te']},
                {term: '為る', source: '為られる',       rule: 'vs', reasons: ['potential or passive']},
                {term: '為る', source: '為れる',         rule: 'vs', reasons: ['passive']},
                {term: '為る', source: '為せる',         rule: 'vs', reasons: ['causative']},
                {term: '為る', source: '為させる',       rule: 'vs', reasons: ['causative']},
                {term: '為る', source: '為せられる',     rule: 'vs', reasons: ['causative', 'potential or passive']},
                {term: '為る', source: '為させられる',   rule: 'vs', reasons: ['causative', 'potential or passive']},
                {term: '為る', source: '為ろ',           rule: 'vs', reasons: ['imperative']},
                {term: '為る', source: '為ない',         rule: 'vs', reasons: ['negative']},
                {term: '為る', source: '為ません',       rule: 'vs', reasons: ['polite negative']},
                {term: '為る', source: '為なかった',     rule: 'vs', reasons: ['negative', 'past']},
                {term: '為る', source: '為ませんでした', rule: 'vs', reasons: ['polite past negative']},
                {term: '為る', source: '為なくて',       rule: 'vs', reasons: ['negative', '-te']},
                {term: '為る', source: '為られない',     rule: 'vs', reasons: ['potential or passive', 'negative']},
                {term: '為る', source: '為れない',       rule: 'vs', reasons: ['passive', 'negative']},
                {term: '為る', source: '為せない',       rule: 'vs', reasons: ['causative', 'negative']},
                {term: '為る', source: '為させない',     rule: 'vs', reasons: ['causative', 'negative']},
                {term: '為る', source: '為せられない',   rule: 'vs', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '為る', source: '為させられない', rule: 'vs', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '為る', source: '為るな',         rule: 'vs', reasons: ['imperative negative']},

                {term: '為る', source: '為れば',         rule: 'vs', reasons: ['-ba']},
                {term: '為る', source: '為ちゃう',       rule: 'vs', reasons: ['-chau']},
                {term: '為る', source: '為ちまう',       rule: 'vs', reasons: ['-chimau']},
                {term: '為る', source: '為なさい',       rule: 'vs', reasons: ['-nasai']},
                {term: '為る', source: '為そう',         rule: 'vs', reasons: ['-sou']},
                {term: '為る', source: '為すぎる',       rule: 'vs', reasons: ['-sugiru']},
                {term: '為る', source: '為たい',         rule: 'vs', reasons: ['-tai']},
                {term: '為る', source: '為たら',         rule: 'vs', reasons: ['-tara']},
                {term: '為る', source: '為たり',         rule: 'vs', reasons: ['-tari']},
                {term: '為る', source: '為ず',           rule: 'vs', reasons: ['-zu']},
                {term: '為る', source: '為ぬ',           rule: 'vs', reasons: ['-nu']},
                {term: '為る', source: '為ざる',           rule: 'vs', reasons: ['-zaru']},
                {term: '為る', source: '為ねば',           rule: 'vs', reasons: ['-neba']},
                // ['masu stem']
                {term: '為る', source: '為ましょう',     rule: 'vs', reasons: ['polite volitional']},
                {term: '為る', source: '為よう',         rule: 'vs', reasons: ['volitional']},
                // ['causative passive']
                {term: '為る', source: '為とく',         rule: 'vs', reasons: ['-toku']},
                {term: '為る', source: '為ている',       rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: '為る', source: '為ておる',       rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: '為る', source: '為てる',         rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: '為る', source: '為とる',         rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: '為る', source: '為てしまう',     rule: 'vs', reasons: ['-te', '-shimau']},

                {term: 'する', source: 'する',           rule: 'vs', reasons: []},
                {term: 'する', source: 'します',         rule: 'vs', reasons: ['polite']},
                {term: 'する', source: 'した',           rule: 'vs', reasons: ['past']},
                {term: 'する', source: 'しました',       rule: 'vs', reasons: ['polite past']},
                {term: 'する', source: 'して',           rule: 'vs', reasons: ['-te']},
                {term: 'する', source: 'できる',         rule: 'vs', reasons: ['potential']},
                {term: 'する', source: '出来る',         rule: 'vs', reasons: ['potential']},
                {term: 'する', source: 'せられる',       rule: 'vs', reasons: ['potential or passive']},
                {term: 'する', source: 'される',         rule: 'vs', reasons: ['passive']},
                {term: 'する', source: 'させる',         rule: 'vs', reasons: ['causative']},
                {term: 'する', source: 'せさせる',       rule: 'vs', reasons: ['causative']},
                {term: 'する', source: 'させられる',     rule: 'vs', reasons: ['causative', 'potential or passive']},
                {term: 'する', source: 'せさせられる',   rule: 'vs', reasons: ['causative', 'potential or passive']},
                {term: 'する', source: 'しろ',           rule: 'vs', reasons: ['imperative']},
                {term: 'する', source: 'しない',         rule: 'vs', reasons: ['negative']},
                {term: 'する', source: 'しません',       rule: 'vs', reasons: ['polite negative']},
                {term: 'する', source: 'しなかった',     rule: 'vs', reasons: ['negative', 'past']},
                {term: 'する', source: 'しませんでした', rule: 'vs', reasons: ['polite past negative']},
                {term: 'する', source: 'しなくて',       rule: 'vs', reasons: ['negative', '-te']},
                {term: 'する', source: 'せられない',     rule: 'vs', reasons: ['potential or passive', 'negative']},
                {term: 'する', source: 'されない',       rule: 'vs', reasons: ['passive', 'negative']},
                {term: 'する', source: 'させない',       rule: 'vs', reasons: ['causative', 'negative']},
                {term: 'する', source: 'せさせない',     rule: 'vs', reasons: ['causative', 'negative']},
                {term: 'する', source: 'させられない',   rule: 'vs', reasons: ['causative', 'potential or passive', 'negative']},
                {term: 'する', source: 'せさせられない', rule: 'vs', reasons: ['causative', 'potential or passive', 'negative']},
                {term: 'する', source: 'するな',         rule: 'vs', reasons: ['imperative negative']},

                {term: 'する', source: 'すれば',         rule: 'vs', reasons: ['-ba']},
                {term: 'する', source: 'しちゃう',       rule: 'vs', reasons: ['-chau']},
                {term: 'する', source: 'しちまう',       rule: 'vs', reasons: ['-chimau']},
                {term: 'する', source: 'しなさい',       rule: 'vs', reasons: ['-nasai']},
                {term: 'する', source: 'しそう',         rule: 'vs', reasons: ['-sou']},
                {term: 'する', source: 'しすぎる',       rule: 'vs', reasons: ['-sugiru']},
                {term: 'する', source: 'したい',         rule: 'vs', reasons: ['-tai']},
                {term: 'する', source: 'したら',         rule: 'vs', reasons: ['-tara']},
                {term: 'する', source: 'したり',         rule: 'vs', reasons: ['-tari']},
                {term: 'する', source: 'せず',           rule: 'vs', reasons: ['-zu']},
                {term: 'する', source: 'せぬ',           rule: 'vs', reasons: ['-nu']},
                {term: 'する', source: 'せざる',           rule: 'vs', reasons: ['-zaru']},
                {term: 'する', source: 'せねば',           rule: 'vs', reasons: ['-neba']},
                // ['masu stem']
                {term: 'する', source: 'しましょう',     rule: 'vs', reasons: ['polite volitional']},
                {term: 'する', source: 'しよう',         rule: 'vs', reasons: ['volitional']},
                // ['causative passive']
                {term: 'する', source: 'しとく',         rule: 'vs', reasons: ['-toku']},
                {term: 'する', source: 'している',       rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: 'する', source: 'しておる',       rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: 'する', source: 'してる',         rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: 'する', source: 'しとる',         rule: 'vs', reasons: ['-te', 'progressive or perfect']},
                {term: 'する', source: 'してしまう',     rule: 'vs', reasons: ['-te', '-shimau']},

                {term: '来る', source: '来る',           rule: 'vk', reasons: []},
                {term: '来る', source: '来ます',         rule: 'vk', reasons: ['polite']},
                {term: '来る', source: '来た',           rule: 'vk', reasons: ['past']},
                {term: '来る', source: '来ました',       rule: 'vk', reasons: ['polite past']},
                {term: '来る', source: '来て',           rule: 'vk', reasons: ['-te']},
                {term: '来る', source: '来られる',       rule: 'vk', reasons: ['potential or passive']},
                {term: '来る', source: '来られる',       rule: 'vk', reasons: ['potential or passive']},
                {term: '来る', source: '来させる',       rule: 'vk', reasons: ['causative']},
                {term: '来る', source: '来させられる',   rule: 'vk', reasons: ['causative', 'potential or passive']},
                {term: '来る', source: '来い',           rule: 'vk', reasons: ['imperative']},
                {term: '来る', source: '来ない',         rule: 'vk', reasons: ['negative']},
                {term: '来る', source: '来ません',       rule: 'vk', reasons: ['polite negative']},
                {term: '来る', source: '来なかった',     rule: 'vk', reasons: ['negative', 'past']},
                {term: '来る', source: '来ませんでした', rule: 'vk', reasons: ['polite past negative']},
                {term: '来る', source: '来なくて',       rule: 'vk', reasons: ['negative', '-te']},
                {term: '来る', source: '来られない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: '来る', source: '来られない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: '来る', source: '来させない',     rule: 'vk', reasons: ['causative', 'negative']},
                {term: '来る', source: '来させられない', rule: 'vk', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '来る', source: '来るな',         rule: 'vk', reasons: ['imperative negative']},

                {term: '来る', source: '来れば',         rule: 'vk', reasons: ['-ba']},
                {term: '来る', source: '来ちゃう',       rule: 'vk', reasons: ['-chau']},
                {term: '来る', source: '来ちまう',       rule: 'vk', reasons: ['-chimau']},
                {term: '来る', source: '来なさい',       rule: 'vk', reasons: ['-nasai']},
                {term: '来る', source: '来そう',         rule: 'vk', reasons: ['-sou']},
                {term: '来る', source: '来すぎる',       rule: 'vk', reasons: ['-sugiru']},
                {term: '来る', source: '来たい',         rule: 'vk', reasons: ['-tai']},
                {term: '来る', source: '来たら',         rule: 'vk', reasons: ['-tara']},
                {term: '来る', source: '来たり',         rule: 'vk', reasons: ['-tari']},
                {term: '来る', source: '来ず',           rule: 'vk', reasons: ['-zu']},
                {term: '来る', source: '来ぬ',           rule: 'vk', reasons: ['-nu']},
                {term: '来る', source: '来ざる',           rule: 'vk', reasons: ['-zaru']},
                {term: '来る', source: '来ねば',           rule: 'vk', reasons: ['-neba']},
                {term: '来る', source: '来',             rule: 'vk', reasons: ['masu stem']},
                {term: '来る', source: '来ましょう',     rule: 'vk', reasons: ['polite volitional']},
                {term: '来る', source: '来よう',         rule: 'vk', reasons: ['volitional']},
                // ['causative passive']
                {term: '来る', source: '来とく',         rule: 'vk', reasons: ['-toku']},
                {term: '来る', source: '来ている',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '来る', source: '来ておる',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '来る', source: '来てる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '来る', source: '来とる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '来る', source: '来てしまう',     rule: 'vk', reasons: ['-te', '-shimau']},

                {term: '來る', source: '來る',           rule: 'vk', reasons: []},
                {term: '來る', source: '來ます',         rule: 'vk', reasons: ['polite']},
                {term: '來る', source: '來た',           rule: 'vk', reasons: ['past']},
                {term: '來る', source: '來ました',       rule: 'vk', reasons: ['polite past']},
                {term: '來る', source: '來て',           rule: 'vk', reasons: ['-te']},
                {term: '來る', source: '來られる',       rule: 'vk', reasons: ['potential or passive']},
                {term: '來る', source: '來られる',       rule: 'vk', reasons: ['potential or passive']},
                {term: '來る', source: '來させる',       rule: 'vk', reasons: ['causative']},
                {term: '來る', source: '來させられる',   rule: 'vk', reasons: ['causative', 'potential or passive']},
                {term: '來る', source: '來い',           rule: 'vk', reasons: ['imperative']},
                {term: '來る', source: '來ない',         rule: 'vk', reasons: ['negative']},
                {term: '來る', source: '來ません',       rule: 'vk', reasons: ['polite negative']},
                {term: '來る', source: '來なかった',     rule: 'vk', reasons: ['negative', 'past']},
                {term: '來る', source: '來ませんでした', rule: 'vk', reasons: ['polite past negative']},
                {term: '來る', source: '來なくて',       rule: 'vk', reasons: ['negative', '-te']},
                {term: '來る', source: '來られない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: '來る', source: '來られない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: '來る', source: '來させない',     rule: 'vk', reasons: ['causative', 'negative']},
                {term: '來る', source: '來させられない', rule: 'vk', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '來る', source: '來るな',         rule: 'vk', reasons: ['imperative negative']},

                {term: '來る', source: '來れば',         rule: 'vk', reasons: ['-ba']},
                {term: '來る', source: '來ちゃう',       rule: 'vk', reasons: ['-chau']},
                {term: '來る', source: '來ちまう',       rule: 'vk', reasons: ['-chimau']},
                {term: '來る', source: '來なさい',       rule: 'vk', reasons: ['-nasai']},
                {term: '來る', source: '來そう',         rule: 'vk', reasons: ['-sou']},
                {term: '來る', source: '來すぎる',       rule: 'vk', reasons: ['-sugiru']},
                {term: '來る', source: '來たい',         rule: 'vk', reasons: ['-tai']},
                {term: '來る', source: '來たら',         rule: 'vk', reasons: ['-tara']},
                {term: '來る', source: '來たり',         rule: 'vk', reasons: ['-tari']},
                {term: '來る', source: '來ず',           rule: 'vk', reasons: ['-zu']},
                {term: '來る', source: '來ぬ',           rule: 'vk', reasons: ['-nu']},
                {term: '來る', source: '來ざる',           rule: 'vk', reasons: ['-zaru']},
                {term: '來る', source: '來ねば',           rule: 'vk', reasons: ['-neba']},
                {term: '來る', source: '來',             rule: 'vk', reasons: ['masu stem']},
                {term: '來る', source: '來ましょう',     rule: 'vk', reasons: ['polite volitional']},
                {term: '來る', source: '來よう',         rule: 'vk', reasons: ['volitional']},
                // ['causative passive']
                {term: '來る', source: '來とく',         rule: 'vk', reasons: ['-toku']},
                {term: '來る', source: '來ている',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '來る', source: '來ておる',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '來る', source: '來てる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '來る', source: '來とる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: '來る', source: '來てしまう',     rule: 'vk', reasons: ['-te', '-shimau']},

                {term: 'くる', source: 'くる',           rule: 'vk', reasons: []},
                {term: 'くる', source: 'きます',         rule: 'vk', reasons: ['polite']},
                {term: 'くる', source: 'きた',           rule: 'vk', reasons: ['past']},
                {term: 'くる', source: 'きました',       rule: 'vk', reasons: ['polite past']},
                {term: 'くる', source: 'きて',           rule: 'vk', reasons: ['-te']},
                {term: 'くる', source: 'こられる',       rule: 'vk', reasons: ['potential or passive']},
                {term: 'くる', source: 'こられる',       rule: 'vk', reasons: ['potential or passive']},
                {term: 'くる', source: 'こさせる',       rule: 'vk', reasons: ['causative']},
                {term: 'くる', source: 'こさせられる',   rule: 'vk', reasons: ['causative', 'potential or passive']},
                {term: 'くる', source: 'こい',           rule: 'vk', reasons: ['imperative']},
                {term: 'くる', source: 'こない',         rule: 'vk', reasons: ['negative']},
                {term: 'くる', source: 'きません',       rule: 'vk', reasons: ['polite negative']},
                {term: 'くる', source: 'こなかった',     rule: 'vk', reasons: ['negative', 'past']},
                {term: 'くる', source: 'きませんでした', rule: 'vk', reasons: ['polite past negative']},
                {term: 'くる', source: 'こなくて',       rule: 'vk', reasons: ['negative', '-te']},
                {term: 'くる', source: 'こられない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: 'くる', source: 'こられない',     rule: 'vk', reasons: ['potential or passive', 'negative']},
                {term: 'くる', source: 'こさせない',     rule: 'vk', reasons: ['causative', 'negative']},
                {term: 'くる', source: 'こさせられない', rule: 'vk', reasons: ['causative', 'potential or passive', 'negative']},
                {term: 'くる', source: 'くるな',         rule: 'vk', reasons: ['imperative negative']},

                {term: 'くる', source: 'くれば',         rule: 'vk', reasons: ['-ba']},
                {term: 'くる', source: 'きちゃう',       rule: 'vk', reasons: ['-chau']},
                {term: 'くる', source: 'きちまう',       rule: 'vk', reasons: ['-chimau']},
                {term: 'くる', source: 'きなさい',       rule: 'vk', reasons: ['-nasai']},
                {term: 'くる', source: 'きそう',         rule: 'vk', reasons: ['-sou']},
                {term: 'くる', source: 'きすぎる',       rule: 'vk', reasons: ['-sugiru']},
                {term: 'くる', source: 'きたい',         rule: 'vk', reasons: ['-tai']},
                {term: 'くる', source: 'きたら',         rule: 'vk', reasons: ['-tara']},
                {term: 'くる', source: 'きたり',         rule: 'vk', reasons: ['-tari']},
                {term: 'くる', source: 'こず',           rule: 'vk', reasons: ['-zu']},
                {term: 'くる', source: 'こぬ',           rule: 'vk', reasons: ['-nu']},
                {term: 'くる', source: 'こざる',           rule: 'vk', reasons: ['-zaru']},
                {term: 'くる', source: 'こねば',           rule: 'vk', reasons: ['-neba']},
                {term: 'くる', source: 'き',             rule: 'vk', reasons: ['masu stem']},
                {term: 'くる', source: 'きましょう',     rule: 'vk', reasons: ['polite volitional']},
                {term: 'くる', source: 'こよう',         rule: 'vk', reasons: ['volitional']},
                // ['causative passive']
                {term: 'くる', source: 'きとく',         rule: 'vk', reasons: ['-toku']},
                {term: 'くる', source: 'きている',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: 'くる', source: 'きておる',       rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: 'くる', source: 'きてる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: 'くる', source: 'きとる',         rule: 'vk', reasons: ['-te', 'progressive or perfect']},
                {term: 'くる', source: 'きてしまう',     rule: 'vk', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-zuru verbs',
            valid: true,
            tests: [
                {term: '論ずる', source: '論ずる',           rule: 'vz', reasons: []},
                {term: '論ずる', source: '論じます',         rule: 'vz', reasons: ['polite']},
                {term: '論ずる', source: '論じた',           rule: 'vz', reasons: ['past']},
                {term: '論ずる', source: '論じました',       rule: 'vz', reasons: ['polite past']},
                {term: '論ずる', source: '論じて',           rule: 'vz', reasons: ['-te']},
                {term: '論ずる', source: '論ぜられる',       rule: 'vz', reasons: ['potential or passive']},
                {term: '論ずる', source: '論ざれる',         rule: 'vz', reasons: ['potential or passive']},
                {term: '論ずる', source: '論じされる',       rule: 'vz', reasons: ['passive']},
                {term: '論ずる', source: '論ぜされる',       rule: 'vz', reasons: ['passive']},
                {term: '論ずる', source: '論じさせる',       rule: 'vz', reasons: ['causative']},
                {term: '論ずる', source: '論ぜさせる',       rule: 'vz', reasons: ['causative']},
                {term: '論ずる', source: '論じさせられる',   rule: 'vz', reasons: ['causative', 'potential or passive']},
                {term: '論ずる', source: '論ぜさせられる',   rule: 'vz', reasons: ['causative', 'potential or passive']},
                {term: '論ずる', source: '論じろ',           rule: 'vz', reasons: ['imperative']},
                {term: '論ずる', source: '論じない',         rule: 'vz', reasons: ['negative']},
                {term: '論ずる', source: '論じません',       rule: 'vz', reasons: ['polite negative']},
                {term: '論ずる', source: '論じなかった',     rule: 'vz', reasons: ['negative', 'past']},
                {term: '論ずる', source: '論じませんでした', rule: 'vz', reasons: ['polite past negative']},
                {term: '論ずる', source: '論じなくて',       rule: 'vz', reasons: ['negative', '-te']},
                {term: '論ずる', source: '論ぜられない',     rule: 'vz', reasons: ['potential or passive', 'negative']},
                {term: '論ずる', source: '論じされない',     rule: 'vz', reasons: ['passive', 'negative']},
                {term: '論ずる', source: '論ぜされない',     rule: 'vz', reasons: ['passive', 'negative']},
                {term: '論ずる', source: '論じさせない',     rule: 'vz', reasons: ['causative', 'negative']},
                {term: '論ずる', source: '論ぜさせない',     rule: 'vz', reasons: ['causative', 'negative']},
                {term: '論ずる', source: '論じさせられない', rule: 'vz', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '論ずる', source: '論ぜさせられない', rule: 'vz', reasons: ['causative', 'potential or passive', 'negative']},
                {term: '論ずる', source: '論ずるな',         rule: 'vz', reasons: ['imperative negative']},

                {term: '論ずる', source: '論ずれば',         rule: 'vz', reasons: ['-ba']},
                {term: '論ずる', source: '論じちゃう',       rule: 'vz', reasons: ['-chau']},
                {term: '論ずる', source: '論じちまう',       rule: 'vz', reasons: ['-chimau']},
                {term: '論ずる', source: '論じなさい',       rule: 'vz', reasons: ['-nasai']},
                {term: '論ずる', source: '論じそう',         rule: 'vz', reasons: ['-sou']},
                {term: '論ずる', source: '論じすぎる',       rule: 'vz', reasons: ['-sugiru']},
                {term: '論ずる', source: '論じたい',         rule: 'vz', reasons: ['-tai']},
                {term: '論ずる', source: '論じたら',         rule: 'vz', reasons: ['-tara']},
                {term: '論ずる', source: '論じたり',         rule: 'vz', reasons: ['-tari']},
                {term: '論ずる', source: '論ぜず',           rule: 'vz', reasons: ['-zu']},
                {term: '論ずる', source: '論ぜぬ',           rule: 'vz', reasons: ['-nu']},
                {term: '論ずる', source: '論ぜざる',           rule: 'vz', reasons: ['-zaru']},
                {term: '論ずる', source: '論ぜねば',           rule: 'vz', reasons: ['-neba']},
                // ['masu stem']
                {term: '論ずる', source: '論じましょう',     rule: 'vz', reasons: ['polite volitional']},
                {term: '論ずる', source: '論じよう',         rule: 'vz', reasons: ['volitional']},
                // ['causative passive']
                {term: '論ずる', source: '論じとく',         rule: 'vz', reasons: ['-toku']},
                {term: '論ずる', source: '論じている',       rule: 'vz', reasons: ['-te', 'progressive or perfect']},
                {term: '論ずる', source: '論じておる',       rule: 'vz', reasons: ['-te', 'progressive or perfect']},
                {term: '論ずる', source: '論じてる',         rule: 'vz', reasons: ['-te', 'progressive or perfect']},
                {term: '論ずる', source: '論じとる',         rule: 'vz', reasons: ['-te', 'progressive or perfect']},
                {term: '論ずる', source: '論じてしまう',     rule: 'vz', reasons: ['-te', '-shimau']}
            ]
        },
        {
            category: '-e verbs',
            valid: true,
            tests: [
                {term: 'すごい',     source: 'すげえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'やばい',     source: 'やべえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'うるさい',   source: 'うるせえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'ひどい',     source: 'ひでえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'ない',       source: 'ねえ',       rule: 'adj-i', reasons: ['-e']},
                {term: 'できる',     source: 'できねえ',   rule: 'v1',    reasons: ['negative', '-e']},
                {term: 'しんじる',   source: 'しんじねえ', rule: 'v1',    reasons: ['negative', '-e']},
                {term: 'さむい',     source: 'さめえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'さむい',     source: 'さみい',     rule: 'adj-i', reasons: ['-e']},
                {term: 'あつい',     source: 'あちぇえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'あつい',     source: 'あちい',     rule: 'adj-i', reasons: ['-e']},
                {term: 'やすい',     source: 'やせえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'たかい',     source: 'たけえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'かわいい',   source: 'かわええ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'つよい',     source: 'ついぇえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'こわい',     source: 'こうぇえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'みじかい',   source: 'みじけえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'ながい',     source: 'なげえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'くさい',     source: 'くせえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'うまい',     source: 'うめえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'でかい',     source: 'でけえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'まずい',     source: 'まっぜえ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'ちっちゃい', source: 'ちっちぇえ', rule: 'adj-i', reasons: ['-e']},
                {term: 'あかい',     source: 'あけえ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'こわい',     source: 'こええ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'つよい',     source: 'つええ',     rule: 'adj-i', reasons: ['-e']},
                // small -e
                {term: 'すごい',     source: 'すげぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'やばい',     source: 'やべぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'うるさい',   source: 'うるせぇ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'ひどい',     source: 'ひでぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'ない',       source: 'ねぇ',       rule: 'adj-i', reasons: ['-e']},
                {term: 'できる',     source: 'できねぇ',   rule: 'v1',    reasons: ['negative', '-e']},
                {term: 'しんじる',   source: 'しんじねぇ', rule: 'v1',    reasons: ['negative', '-e']},
                {term: 'さむい',     source: 'さめぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'さむい',     source: 'さみぃ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'あつい',     source: 'あちぃ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'やすい',     source: 'やせぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'たかい',     source: 'たけぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'みじかい',   source: 'みじけぇ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'ながい',     source: 'なげぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'くさい',     source: 'くせぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'うまい',     source: 'うめぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'でかい',     source: 'でけぇ',     rule: 'adj-i', reasons: ['-e']},
                {term: 'まずい',     source: 'まっぜぇ',   rule: 'adj-i', reasons: ['-e']},
                {term: 'あかい',     source: 'あけぇ',     rule: 'adj-i', reasons: ['-e']}
            ]
        },
        {
            category: 'irregular verbs',
            valid: false,
            tests: [
                {term: 'する', source: 'すます',         rule: 'vs', reasons: null},
                {term: 'する', source: 'すた',           rule: 'vs', reasons: null},
                {term: 'する', source: 'すました',       rule: 'vs', reasons: null},
                {term: 'する', source: 'すて',           rule: 'vs', reasons: null},
                {term: 'する', source: 'すれる',         rule: 'vs', reasons: null},
                {term: 'する', source: 'すせる',         rule: 'vs', reasons: null},
                {term: 'する', source: 'すせられる',     rule: 'vs', reasons: null},
                {term: 'する', source: 'すろ',           rule: 'vs', reasons: null},
                {term: 'する', source: 'すない',         rule: 'vs', reasons: null},
                {term: 'する', source: 'すません',       rule: 'vs', reasons: null},
                {term: 'する', source: 'すなかった',     rule: 'vs', reasons: null},
                {term: 'する', source: 'すませんでした', rule: 'vs', reasons: null},
                {term: 'する', source: 'すなくて',       rule: 'vs', reasons: null},
                {term: 'する', source: 'すれない',       rule: 'vs', reasons: null},
                {term: 'する', source: 'すせない',       rule: 'vs', reasons: null},
                {term: 'する', source: 'すせられない',   rule: 'vs', reasons: null},

                {term: 'くる', source: 'くます',         rule: 'vk', reasons: null},
                {term: 'くる', source: 'くた',           rule: 'vk', reasons: null},
                {term: 'くる', source: 'くました',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くて',           rule: 'vk', reasons: null},
                {term: 'くる', source: 'くられる',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くられる',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くさせる',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くさせられる',   rule: 'vk', reasons: null},
                {term: 'くる', source: 'くい',           rule: 'vk', reasons: null},
                {term: 'くる', source: 'くない',         rule: 'vk', reasons: null},
                {term: 'くる', source: 'くません',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くなかった',     rule: 'vk', reasons: null},
                {term: 'くる', source: 'くませんでした', rule: 'vk', reasons: null},
                {term: 'くる', source: 'くなくて',       rule: 'vk', reasons: null},
                {term: 'くる', source: 'くられない',     rule: 'vk', reasons: null},
                {term: 'くる', source: 'くられない',     rule: 'vk', reasons: null},
                {term: 'くる', source: 'くさせない',     rule: 'vk', reasons: null},
                {term: 'くる', source: 'くさせられない', rule: 'vk', reasons: null}
            ]
        },
        {
            category: 'uncommon irregular verbs',
            valid: true,
            tests: [
                {term: 'のたまう', source: 'のたもうて',   rule: 'v5', reasons: ['-te']},
                {term: 'のたまう', source: 'のたもうた',   rule: 'v5', reasons: ['past']},
                {term: 'のたまう', source: 'のたもうたら', rule: 'v5', reasons: ['-tara']},
                {term: 'のたまう', source: 'のたもうたり', rule: 'v5', reasons: ['-tari']},

                {term: 'おう', source: 'おうて', rule: 'v5', reasons: ['-te']},
                {term: 'こう', source: 'こうて', rule: 'v5', reasons: ['-te']},
                {term: 'そう', source: 'そうて', rule: 'v5', reasons: ['-te']},
                {term: 'とう', source: 'とうて', rule: 'v5', reasons: ['-te']},
                {term: '請う', source: '請うて', rule: 'v5', reasons: ['-te']},
                {term: '乞う', source: '乞うて', rule: 'v5', reasons: ['-te']},
                {term: '恋う', source: '恋うて', rule: 'v5', reasons: ['-te']},
                {term: '問う', source: '問うて', rule: 'v5', reasons: ['-te']},
                {term: '負う', source: '負うて', rule: 'v5', reasons: ['-te']},
                {term: '沿う', source: '沿うて', rule: 'v5', reasons: ['-te']},
                {term: '添う', source: '添うて', rule: 'v5', reasons: ['-te']},
                {term: '副う', source: '副うて', rule: 'v5', reasons: ['-te']},
                {term: '厭う', source: '厭うて', rule: 'v5', reasons: ['-te']},

                {term: 'おう', source: 'おうた', rule: 'v5', reasons: ['past']},
                {term: 'こう', source: 'こうた', rule: 'v5', reasons: ['past']},
                {term: 'そう', source: 'そうた', rule: 'v5', reasons: ['past']},
                {term: 'とう', source: 'とうた', rule: 'v5', reasons: ['past']},
                {term: '請う', source: '請うた', rule: 'v5', reasons: ['past']},
                {term: '乞う', source: '乞うた', rule: 'v5', reasons: ['past']},
                {term: '恋う', source: '恋うた', rule: 'v5', reasons: ['past']},
                {term: '問う', source: '問うた', rule: 'v5', reasons: ['past']},
                {term: '負う', source: '負うた', rule: 'v5', reasons: ['past']},
                {term: '沿う', source: '沿うた', rule: 'v5', reasons: ['past']},
                {term: '添う', source: '添うた', rule: 'v5', reasons: ['past']},
                {term: '副う', source: '副うた', rule: 'v5', reasons: ['past']},
                {term: '厭う', source: '厭うた', rule: 'v5', reasons: ['past']},

                {term: 'おう', source: 'おうたら', rule: 'v5', reasons: ['-tara']},
                {term: 'こう', source: 'こうたら', rule: 'v5', reasons: ['-tara']},
                {term: 'そう', source: 'そうたら', rule: 'v5', reasons: ['-tara']},
                {term: 'とう', source: 'とうたら', rule: 'v5', reasons: ['-tara']},
                {term: '請う', source: '請うたら', rule: 'v5', reasons: ['-tara']},
                {term: '乞う', source: '乞うたら', rule: 'v5', reasons: ['-tara']},
                {term: '恋う', source: '恋うたら', rule: 'v5', reasons: ['-tara']},
                {term: '問う', source: '問うたら', rule: 'v5', reasons: ['-tara']},
                {term: '負う', source: '負うたら', rule: 'v5', reasons: ['-tara']},
                {term: '沿う', source: '沿うたら', rule: 'v5', reasons: ['-tara']},
                {term: '添う', source: '添うたら', rule: 'v5', reasons: ['-tara']},
                {term: '副う', source: '副うたら', rule: 'v5', reasons: ['-tara']},
                {term: '厭う', source: '厭うたら', rule: 'v5', reasons: ['-tara']},

                {term: 'おう', source: 'おうたり', rule: 'v5', reasons: ['-tari']},
                {term: 'こう', source: 'こうたり', rule: 'v5', reasons: ['-tari']},
                {term: 'そう', source: 'そうたり', rule: 'v5', reasons: ['-tari']},
                {term: 'とう', source: 'とうたり', rule: 'v5', reasons: ['-tari']},
                {term: '請う', source: '請うたり', rule: 'v5', reasons: ['-tari']},
                {term: '乞う', source: '乞うたり', rule: 'v5', reasons: ['-tari']},
                {term: '恋う', source: '恋うたり', rule: 'v5', reasons: ['-tari']},
                {term: '問う', source: '問うたり', rule: 'v5', reasons: ['-tari']},
                {term: '負う', source: '負うたり', rule: 'v5', reasons: ['-tari']},
                {term: '沿う', source: '沿うたり', rule: 'v5', reasons: ['-tari']},
                {term: '添う', source: '添うたり', rule: 'v5', reasons: ['-tari']},
                {term: '副う', source: '副うたり', rule: 'v5', reasons: ['-tari']},
                {term: '厭う', source: '厭うたり', rule: 'v5', reasons: ['-tari']}
            ]
        },
        {
            category: 'combinations',
            valid: true,
            tests: [
                {term: '抱き抱える', source: '抱き抱えていなければ', rule: 'v1', reasons: ['-te', 'progressive or perfect', 'negative', '-ba']},
                {term: '抱きかかえる', source: '抱きかかえていなければ', rule: 'v1', reasons: ['-te', 'progressive or perfect', 'negative', '-ba']},
                {term: '打ち込む', source: '打ち込んでいませんでした', rule: 'v5', reasons: ['-te', 'progressive or perfect', 'polite past negative']},
                {term: '食べる', source: '食べさせられたくなかった', rule: 'v1', reasons: ['causative', 'potential or passive', '-tai', 'negative', 'past']}
            ]
        },
        {
            category: 'kawaii (this leads to infinite expansions)',
            valid: false,
            tests: [
                {term: 'かわいい', source: 'かわいげ',   rule: 'adj-i', reasons: ['-ge']},
                {term: '可愛い',   source: 'かわいげ',   rule: 'adj-i', reasons: ['-ge']}
            ]
        },
        {
            category: 'incorrect -te rule chain',
            valid: false,
            tests: [
                {term: '食べる', source: '食べて', rule: null, reasons: ['-te', 'progressive or perfect', 'masu stem']}
            ]
        },
        // Kansai-ben
        {
            category: '-ku stem of kansai-ben adjectives',
            valid: true,
            tests: [
                {term: '宜しい', source: '宜しゅう', rule: null, reasons: ['adv', 'kansai-ben']},
                {term: 'よろしい', source: 'よろしゅう', rule: null, reasons: ['adv', 'kansai-ben']},
                {term: '良い', source: '良う', rule: null, reasons: ['adv', 'kansai-ben']},
                {term: 'よい', source: 'よう', rule: null, reasons: ['adv', 'kansai-ben']}
            ]
        },
        {
            category: '-te form of kansai-ben adjectives',
            valid: true,
            tests: [
                {term: 'よろしい', source: 'よろしゅうて', rule: null, reasons: ['-te', 'kansai-ben']},
                {term: '宜しい', source: '宜しゅうて', rule: null, reasons: ['-te', 'kansai-ben']},
                {term: 'よい', source: 'ようて', rule: null, reasons: ['-te', 'kansai-ben']},
                {term: '良い', source: '良うて', rule: null, reasons: ['-te', 'kansai-ben']}
            ]
        },
        {
            category: 'Negative form of kansai-ben adjectives',
            valid: true,
            tests: [
                {term: 'よろしい', source: 'よろしゅうない', rule: null, reasons: ['negative', 'kansai-ben']},
                {term: '宜しい', source: '宜しゅうない', rule: null, reasons: ['negative', 'kansai-ben']},
                {term: 'よい', source: 'ようない', rule: null, reasons: ['negative', 'kansai-ben']},
                {term: '良い', source: '良うない', rule: null, reasons: ['negative', 'kansai-ben']}
            ]
        },
        {
            category: 'Negative form of kansai-ben verbs',
            valid: true,
            tests: [
                {term: '食べる', source: '食べへん', rule: null, reasons: ['negative', 'kansai-ben']},
                {term: '食べる', source: '食べへんかった', rule: null, reasons: ['negative', 'past', 'kansai-ben']}
            ]
        },
        {
            category: '-te form of kansai-ben verbs',
            valid: true,
            tests: [
                {term: '買う', source: '買うて', rule: null, reasons: ['-te', 'kansai-ben']},
                {term: 'かう', source: 'こうて', rule: null, reasons: ['-te', 'kansai-ben']},
                {term: 'はう', source: 'ほうて', rule: null, reasons: ['-te', 'kansai-ben']}
            ]
        },
        {
            category: 'past form of kansai-ben terms',
            valid: true,
            tests: [
                {term: '買う', source: '買うた', rule: null, reasons: ['past', 'kansai-ben']},
                {term: 'かう', source: 'こうた', rule: null, reasons: ['past', 'kansai-ben']},
                {term: 'はう', source: 'ほうた', rule: null, reasons: ['past', 'kansai-ben']}
            ]
        },
        {
            category: '-tara form of kansai-ben terms',
            valid: true,
            tests: [
                {term: '買う', source: '買うたら', rule: null, reasons: ['-tara', 'kansai-ben']},
                {term: 'かう', source: 'こうたら', rule: null, reasons: ['-tara', 'kansai-ben']},
                {term: 'はう', source: 'ほうたら', rule: null, reasons: ['-tara', 'kansai-ben']}
            ]
        }
    ];
    /* eslint-enable no-multi-spaces */

    /** @type {import('language-transformer').LanguageTransformDescriptor} */
    const descriptor = parseJson(fs.readFileSync(path.join(dirname, '..', 'ext', 'data/language/japanese-transforms.json'), {encoding: 'utf8'}));
    const languageTransformer = new LanguageTransformer();
    languageTransformer.addDescriptor(descriptor);

    describe('deinflections', () => {
        // for (const {valid, tests} of data) {
        describe.each(data)('$category', ({valid, tests}) => {
            for (const {source, term, rule, reasons} of tests) {
                const {has} = hasTermReasons(languageTransformer, source, term, rule, reasons);
                let message = `${source} ${valid ? 'has' : 'does not have'} term candidate ${JSON.stringify(term)}`;
                if (rule !== null) {
                    message += ` with rule ${JSON.stringify(rule)}`;
                }
                if (reasons !== null) {
                    message += (typeof rule !== 'undefined' ? ' and' : ' with');
                    message += ` reasons ${JSON.stringify(reasons)}`;
                }
                test(`${message}`, () => {
                    expect(has).toStrictEqual(valid);
                });
            }
        });
    });
}


/** */
function main() {
    testDeinflections();
}

main();
