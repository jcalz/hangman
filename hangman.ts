




interface WordAndFrequency {
    word: string,
    freq: number,
    augmented?: true,
}

type Lit = string | number | boolean | void | undefined | null | object;
const tuple = <T extends Lit[]>(...args: T) => args;
const letters = tuple('E', 'T', 'A', 'O', 'I', 'N', 'S', 'R', 'H', 'L', 'D', 'C', 'U', 'M', 'F', 'P', 'G', 'W', 'Y', 'B', 'V', 'K', 'X', 'J', 'Q', 'Z');
type Letter = typeof letters[number];

const placeHolder = '*';
type PlaceHolder = typeof placeHolder;


//import wordsByLengthWithFrequency from './wordsByLengthWithFrequency'
// from http://norvig.com/google-books-common-words.txt
// re=/([A-Z]+)\s*(\d+)/;ret=[[]];document.body.textContent.split('\n').map(s=>s.match(re)).filter(s=>s).map(s => ({word:s[1], freq:parseInt(s[2])})).forEach(r => (ret[r.word.length] = ret[r.word.length] || []).push(r));document.body.textContent=JSON.stringify(ret);
declare const wordsByLengthWithFrequency: WordAndFrequency[][];

declare const contractionsWithFrequency: WordAndFrequency[];

// import likelyNextWords from './likelyNextWords'
// from https://www.ngrams.info/coca/download/w2_.zip
// Davies, Mark. (2011) N-grams data from the Corpus of Contemporary American English (COCA). Downloaded from http://www.ngrams.info on September 30, 2018.
// likelyNextWords:
// ret={}; document.body.innerText.split('\n').map(s => s.split('\t').map(x => x.toUpperCase())).filter(([f, w1, w2]) => (f > 75) && !(w1+w2).match(/[^a-z']/i)).forEach(([f, w1, w2])=>(ret[w1] = ret[w1] || [], ret[w1].push(w2))); document.body.textContent=JSON.stringify(ret)
// lilelyPrevWords:
// ret={}; document.body.innerText.split('\n').map(s => s.split('\t').map(x => x.toUpperCase())).filter(([f, w1, w2]) => (f > 75) && !(w1+w2).match(/[^a-z']/i)).forEach(([f, w1, w2])=>(ret[w2] = ret[w2] || [], ret[w2].push(w1))); document.body.textContent=JSON.stringify(ret)
declare const likelyNextWords: { [k: string]: string[] | undefined };
declare const likelyPrevWords: { [k: string]: string[] | undefined };


// import bigramsWithFrequency from './bigramsWithFrequency'
// from https://gist.githubusercontent.com/lydell/c439049abac2c9226e53/raw/4cfe39fd90d6ad25c4e683b6371009f574e1177f/bigrams.json
// const fwd = {}; const bak = {}; JSON.parse(document.body.innerText).forEach(([[a,b],freq])=>{ a=a.toUpperCase(); b=b.toUpperCase(); fwd[a] = fwd[a] || {}; bak[b] = bak[b] || {}; fwd[a][b] = freq; bak[b][a] = freq; } ); document.body.textContent = "const forwardBigramFrequency = "+JSON.stringify(fwd)+";\nconst backwardBigramFrequency = "+JSON.stringify(bak);declare const bigramsWithFrequency: BigramWithFrequency[];

declare const forwardBigramFrequency: Record<Letter, Record<Letter, number>>;
declare const backwardBigramFrequency: Record<Letter, Record<Letter, number>>;

// get words all uppercase or something
function wordsAndFrequencies(length: number): WordAndFrequency[] {
    return wordsByLengthWithFrequency[length];
}

/*
function wordsAndFrequenciesMatching(puzzle: string, guessedLetters: Partial<Record<Letter, true>>): WordAndFrequency[] {
    const len = puzzle.length;
    return wordsByLengthWithFrequency[puzzle.length].filter(soln => {
        for (let j = 0; j < len; j++) {
            if (puzzle[j] === placeHolder) {
                if (soln.word[j] in guessedLetters) return false;
            } else {
                if (puzzle[j] !== soln.word[j]) return false;
            }
        }
        return true;
    }).slice();     
}
*/

class Puzzler {
    public puzzleString: string;
    constructor(public solution: string) {
        this.solution = this.solution.toUpperCase();
        this.puzzleString = this.solution.replace(/[A-Z]/g, placeHolder);
    }

    public guess(letter: Letter): number {
        letter = letter.toUpperCase() as Letter;
        let cnt = 0;
        this.puzzleString = this.solution.split('').map((c, i) => (c === letter) ? (cnt++ , c) : this.puzzleString[i]).join('');
        return cnt;
    }

}


function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
const alphaOrPlaceHolder = '[a-z' + escapeRegExp(placeHolder) + ']';
const splitAlphaRegExp = new RegExp(
    '(' + alphaOrPlaceHolder + alphaOrPlaceHolder + '*(?:\'' +
    alphaOrPlaceHolder + ')?' + alphaOrPlaceHolder + '*)', 'i');

function splitAlpha(x: string): { initNonAlpha: string, alphas: { alpha: string, nonAlpha: string }[] } {

    const splits = x.split(splitAlphaRegExp);
    const initNonAlpha = splits.shift()!;
    const alphas = splits.map((_, i) => i).filter(i => i % 2 === 0).map(i => ({ alpha: splits[i], nonAlpha: splits[i + 1] }));
    return { initNonAlpha, alphas };
}

interface WordAndPossibleSolutions {
    puzzle: string;
    nonAlphaAfterPuzzle: string;
    possibleSolutions: WordAndFrequency[];
}

class Puzzle {
    nonAlphaBeforePuzzle: string = "";
    wordsAndPossibleSolutions: WordAndPossibleSolutions[] = [];

    constructor(puzzleString: string, public guessedLetters: Partial<Record<Letter, true>> = {}) {
        const puzzlePieces = splitAlpha(puzzleString);
        //console.log(puzzlePieces);
        this.nonAlphaBeforePuzzle = puzzlePieces.initNonAlpha;

        const wordPoolByPuzzle = function (puzzle: string): WordAndFrequency[] {
            if (puzzle.indexOf("'") < 0) {
                return wordsAndFrequencies(puzzle.length).slice();
            }
            const ret = contractionsWithFrequency.slice();
            if (puzzle.indexOf("'") === puzzle.length - 2) {
                // if there is just one letter after the apostrophe, it's probably S
                // add to the known contractions all words with 'S stuck on the end,
                // discounted in probability
                const prefixes = wordsAndFrequencies(puzzle.length - 2).slice();
                prefixes.forEach(wf => ret.push({ word: wf.word + "'S", freq: wf.freq / 10 }));
                sortBy(ret, p => -p.freq);
            }
            return ret;
        }

        this.wordsAndPossibleSolutions = puzzlePieces.alphas.map(w => ({
            puzzle: w.alpha,
            nonAlphaAfterPuzzle: w.nonAlpha,
            possibleSolutions: wordPoolByPuzzle(w.alpha)
        }));

        // TODO remove initial update or refactor to make real guess
        this.update('' as Letter, puzzleString);
    }

    update(guessedLetter: Letter, puzzleString: string) {

        if (guessedLetter) {
            if (this.guessedLetters[guessedLetter]) {
                throw new Error("You already guessed " + guessedLetter);
            }
            this.guessedLetters[guessedLetter] = true;
        }

        const acceptableUpdate = (orig: string, updated: string): boolean => {
            if (orig.length !== updated.length) return false;
            for (let i = 0; i < orig.length; i++) {
                if ((orig[i] !== placeHolder) && (orig[i] !== updated[i])) return false;
            }
            return true;
        }

        let i = 0;
        let len = this.nonAlphaBeforePuzzle.length
        const nonAlphaBeforePuzzle = puzzleString.substring(i, i + len);
        if (nonAlphaBeforePuzzle !== this.nonAlphaBeforePuzzle) {
            throw new Error("You can't change the inital string from \"" + this.nonAlphaBeforePuzzle + "\" to \"" + nonAlphaBeforePuzzle + "\"!");
        }
        i += len;
        for (let p = 0; p < this.wordsAndPossibleSolutions.length; p++) {
            const wps = this.wordsAndPossibleSolutions[p]
            len = wps.puzzle.length;
            const alpha = puzzleString.substring(i, i + len);
            if (!acceptableUpdate(wps.puzzle, alpha)) {
                throw new Error("You can't change \"" + wps.puzzle + "\" to \"" + alpha + "\"!");
            }
            wps.puzzle = alpha; // updated
            i += len;
            len = wps.nonAlphaAfterPuzzle.length;
            const nonAlpha = puzzleString.substring(i, i + len);
            if (nonAlpha !== wps.nonAlphaAfterPuzzle) {
                throw new Error("You can't change \"" + wps.nonAlphaAfterPuzzle + "\" to \"" + nonAlpha + "\"!");
            }
            i += len;
        }
        const extra = puzzleString.substring(i);
        if (extra !== "") {
            throw new Error("You can't add \"" + extra + "\" onto the end!");
        }


        const solutionStillPossible = (wps: WordAndPossibleSolutions) => (soln: WordAndFrequency) => {
            const len = wps.puzzle.length;
            if (soln.word.length !== len) return false;
            for (let j = 0; j < len; j++) {
                if (wps.puzzle[j] === placeHolder) {
                    if (soln.word[j] in this.guessedLetters) return false;
                } else {
                    if (wps.puzzle[j] !== soln.word[j]) return false;
                }
            }
            return true;
        };



        for (let i = 0; i < this.wordsAndPossibleSolutions.length; i++) {
            const wps = this.wordsAndPossibleSolutions[i];
            wps.possibleSolutions = wps.possibleSolutions.filter(solutionStillPossible(wps));


            if (wps.possibleSolutions.filter(wps => !wps.word.includes(placeHolder)).length === 0) {
                // we've run out of known contractions so let's try each piece of the word separately
                if (wps.puzzle.indexOf("'") !== -1) {
                    // let's decontractify this thing
                    const [pre, post] = wps.puzzle.split("'", 2);
                    const wpsPre: WordAndPossibleSolutions = {
                        puzzle: pre,
                        nonAlphaAfterPuzzle: "'",
                        possibleSolutions: wordsAndFrequencies(pre.length).slice()
                    };
                    const wpsPost: WordAndPossibleSolutions = {
                        puzzle: post,
                        nonAlphaAfterPuzzle: wps.nonAlphaAfterPuzzle,
                        possibleSolutions: wordsAndFrequencies(post.length).slice()
                    };
                    this.wordsAndPossibleSolutions.splice(i, 1, wpsPre, wpsPost);
                    i--;
                    continue;
                }

                console.log("Oh no I have no idea what \"" + wps.puzzle + "\" is");
         
                // at this point we should guess based on bigrams?
                // find any known letters and look at subsequent and previous letter and make some
                // probabilistic guesses based on unguessed letters, right?

                wps.possibleSolutions = [];
                const unguessedLetters = letters.filter(l => !(l in this.guessedLetters))
                wps.puzzle.split('').forEach((c, i) => {
                    if (c !== placeHolder) return;
                    const prevLetter = (i==0) ? placeHolder : wps.puzzle.charAt(i - 1) as Letter | typeof placeHolder;
                    const nextLetter = (i==wps.puzzle.length-1) ? placeHolder : wps.puzzle.charAt(i + 1) as Letter | typeof placeHolder;                    
                    if ((prevLetter === placeHolder) && (nextLetter === placeHolder)) return;
                    const possibleSolutions = {} as Record<Letter, WordAndFrequency>;
                    
                    unguessedLetters.forEach(l => possibleSolutions[l] = {freq: 1, word: wps.puzzle.slice(0,i)+l+wps.puzzle.slice(i+1)});

                    if (prevLetter !== placeHolder) {                        
                        unguessedLetters.forEach(l => possibleSolutions[l].freq *= forwardBigramFrequency[prevLetter][l]);
                    }
                    if (nextLetter !== placeHolder) {
                        unguessedLetters.forEach(l => possibleSolutions[l].freq *= backwardBigramFrequency[nextLetter][l]);
                    }

                    const freqSum = unguessedLetters.reduce((s, l) => s + possibleSolutions[l].freq, 0);
                    unguessedLetters.forEach(l => possibleSolutions[l].freq /= freqSum);

                    unguessedLetters.forEach(l => wps.possibleSolutions.push(possibleSolutions[l]));

                })
                sortBy(wps.possibleSolutions, ps => -ps.freq);
                console.log("POSSIBLE SOLUTIONS: \n"+wps.possibleSolutions.map(wps => wps.word + ": " + (wps.freq*100).toFixed(1)+"% ").join("\n")+"\n-------");                
                

                // this should probably not happen but maybe the word is completely unknown for some reason
                if (wps.possibleSolutions.length === 0) {
                    wps.possibleSolutions.push({ word: wps.puzzle, freq: 1 });
                }

            }

        }

    }


    bestSolution(num: number = 0) {
        return this.nonAlphaBeforePuzzle + this.wordsAndPossibleSolutions.map(wps =>
            (wps.possibleSolutions[num] ? wps.possibleSolutions[num].word : wps.puzzle) + wps.nonAlphaAfterPuzzle
        ).join("");

    }


    bestLetterGuess(): Letter | undefined {

        const unguessedLetters = letters.filter(c => !(c in this.guessedLetters));

        const uniqueLettersIn = (x: string) => {
            const tally: Partial<Record<Letter, true>> = {};
            (x.split('') as Letter[]).forEach(c => tally[c] = true);
            return (Object.keys(tally) as Letter[]);
        }

        const initLetterMap = <T>(v: T) => {
            const ret = {} as Record<Letter, T>;
            unguessedLetters.forEach(c => ret[c] = v);
            return ret;
        }

        const probLetterNotPresent = initLetterMap(1);

        const combine = (acc: number, cur: number) => acc + cur; //Math.max(acc, cur);

        // unaugment everything
        // HACK HACK HACK
        this.wordsAndPossibleSolutions.forEach(wps => {
            let unaugmentedSomething = false;
            wps.possibleSolutions.filter(s => s.augmented).forEach(s => { unaugmentedSomething = true; delete s.augmented; s.freq /= 10000 });
            if (unaugmentedSomething) sortBy(wps.possibleSolutions, ps => -ps.freq);


        })

        const limit = 15;

        // augment probabilities of neighboring words if we are fairly certain of the current word
        this.wordsAndPossibleSolutions.
            forEach((wps, wpsindex) => {

                let freqSum = 0;
                for (let i = 0; i < wps.possibleSolutions.length && i < limit * 2; i++) {
                    freqSum += wps.possibleSolutions[i].freq;
                }

                for (let i = 0; i < wps.possibleSolutions.length && i < limit; i++) {
                    const soln = wps.possibleSolutions[i];
                    const prob = soln.freq / freqSum;

                    // okay we've found a word we think is more than 50% likely; let's bump
                    // possible next words to the top of the list for the next word.  This is a
                    // HACK, since we shouldn't permanently alter the next word.  The right thing to
                    // do would be to temporarily alter the next word and do that every time.
                    // but this is easier ?                
                    if (prob > 0.5) {
                        [
                            { index: wpsindex + 1, otherWords: likelyNextWords, pos: "next" },
                            { index: wpsindex - 1, otherWords: likelyPrevWords, pos: "prev" }
                        ].forEach(v => {
                            const wpsNext = this.wordsAndPossibleSolutions[v.index];
                            if (wpsNext) {
                                const nextWords = v.otherWords[soln.word];
                                if (nextWords) {
                                    const nextWordSet: { [k: string]: true | undefined } = {};
                                    nextWords.forEach(w => nextWordSet[w] = true);
                                    const augmented: string[] = [];
                                    wpsNext.possibleSolutions.forEach(wps => {
                                        if (nextWordSet[wps.word] && !wps.augmented) {
                                            augmented.push(wps.word);
                                            wps.augmented = true;
                                            wps.freq *= 10000; // make it much more likely
                                        }
                                    });
                                    if (augmented.length) {
                                        sortBy(wpsNext.possibleSolutions, wps => -wps.freq);
                                        console.log("For word " + (wpsindex + 1) + ", probably \"" + soln.word + "\"... for the " + v.pos + " word, \"" + wpsNext.puzzle + "\", I augmented:");
                                        console.log(augmented.slice(0, 15).join(",") + (augmented.length >= 15 ? "..." : ""));
                                    }

                                }
                            }
                        })

                    }
                }
            })

        // determine new probabilities for each word
        this.wordsAndPossibleSolutions.
            forEach((wps, wpsindex) => {

                let freqSum = 0;
                for (let i = 0; i < wps.possibleSolutions.length && i < limit * 2; i++) {
                    freqSum += wps.possibleSolutions[i].freq;
                }
                const probLetterNotInThisWord = initLetterMap(1);
                for (let i = 0; i < wps.possibleSolutions.length && i < limit; i++) {
                    const soln = wps.possibleSolutions[i];
                    const prob = soln.freq / freqSum;
                    uniqueLettersIn(soln.word).forEach(c => probLetterNotInThisWord[c] -= prob);
                }
                unguessedLetters.forEach(c => probLetterNotPresent[c] *= probLetterNotInThisWord[c]);
            })

        if (this.wordsAndPossibleSolutions.every(x => x.puzzle.indexOf(placeHolder) < 0)) return undefined;

        const guesses = sortBy(unguessedLetters, c => probLetterNotPresent[c]);
        //console.log(guesses.map(k => k + ":" + ((1 - probLetterNotPresent[k]) * 100).toFixed(0) + "%").join(", "))
        //console.log(guesses.join(''))
        return guesses[0]
    }

}

function sortBy<T, U>(array: T[], map: (x: T) => U) {
    const cmp = (a: U, b: U) => (a < b) ? -1 : (b < a) ? 1 : 0
    return array.sort((a, b) => cmp(map(a), map(b)));
}


function hasTagName<K extends keyof HTMLElementTagNameMap>(htmlElement: HTMLElement | EventTarget, tagName: K): htmlElement is HTMLElementTagNameMap[K] {
    return ('tagName' in htmlElement) && (htmlElement.tagName.toLowerCase() === tagName.toLowerCase());
}


function hmm(puzzleString: string, output: (s: string) => void = console.log.bind(console)) {

    let guess: Letter | undefined;
    const puzzler = new Puzzler(puzzleString.toUpperCase());
    const puzzle = new Puzzle(puzzler.puzzleString);

    output(puzzler.puzzleString);

    while (guess = puzzle.bestLetterGuess()) {
        output("(" + [0 /*,1,2*/].map(i => puzzle.bestSolution(i)).join("; ") + ")... guessing " + guess);
        const num = puzzler.guess(guess);
        output("");
        output((num ? "" : "UH OH!!!! ") + "There are " + num)
        output(puzzler.puzzleString);
        if (puzzler.puzzleString.indexOf(placeHolder) < 0) {
            output("got it!");
            break;
        }
        puzzle.update(guess, puzzler.puzzleString);

    }



}



function isLetterDiv(x: EventTarget | LetterDivElement): x is LetterDivElement {
    return hasTagName(x, 'div') && ('isLetterDivElement' in x) && (!!x.isLetterDivElement);

}

function mod(x: number, n: number) {
    return ((x % n) + n) % n;
}


interface LetterDivElement extends HTMLDivElement {
    isLetterDivElement: true,
    row: number,
    column: number,
    index: number,
}
const letterDivs: LetterDivElement[] = [];
const letterDivRows: LetterDivElement[][] = [];
const guessedLetterDivs = {} as Record<Letter, HTMLDivElement>;

let currentPuzzle: Puzzle | undefined;
let bestLetterGuess: Letter | undefined;

function getDivById(divId: string) {
    const div = document.getElementById(divId);
    if (!div || !hasTagName(div, "div")) throw new Error("No div with ID \"" + divId + "\"");
    return div;
}

function initializePage() {
    const numRows = 4;
    const numColumns = 14;
    const board = getDivById("board");
    const message = getDivById("message");
    const guesses = getDivById("guesses");
    const num = numRows * numColumns

    for (let r = 0, i = 0; r < numRows; r++) {
        letterDivRows[r] = [];
        for (let c = 0; c < numColumns; c++ , i++) {

            const div = Object.assign(document.createElement('div'), {
                isLetterDivElement: true as true,
                row: r,
                column: c,
                index: i
            });

            letterDivRows[r][c] = div;
            letterDivs[i] = div;
            div.setAttribute('tabIndex', '0');
            div.classList.add('letter');
            div.style.gridRowStart = "" + r + 1;
            div.style.gridColumnStart = "" + c + 1;
            div.addEventListener('click', () => {
                div.focus();
                if (currentPuzzle && bestLetterGuess && !oopsMode()) {
                    if (div.textContent === ' ') {
                        div.textContent = bestLetterGuess;
                    } else if (div.textContent === bestLetterGuess) {
                        div.textContent = ' '
                    }
                    const selection = document.getSelection();
                    if (selection) selection.removeAllRanges();
                }
            });
            board.appendChild(div);
        }
    }

    letters.slice().sort().forEach((c, i) => {
        const div = document.createElement('div');
        div.setAttribute('tabIndex', '0');
        div.classList.add('letter');
        div.textContent = c;
        div.style.gridColumnStart = "" + (i + 1);
        div.style.gridRowStart = "1";
        guesses.appendChild(div);
        guessedLetterDivs[c] = div;
    }
    );

    board.addEventListener("keydown", event => {

        const div = event.target;
        if (!div || !isLetterDiv(div))
            return;

        event.preventDefault();

        const i = div.index;
        const next = letterDivs[mod(i + 1, num)];
        const prev = letterDivs[mod(i - 1, num)];
        const blank = oopsMode() ? ' ' : '';
        if (!currentPuzzle || (oopsMode() && div.textContent !== '')) {
            const key = event.key.toUpperCase();
            if (
                (event.key.length === 1) &&
                (!currentPuzzle || (key in currentPuzzle.guessedLetters) || (key === bestLetterGuess))
            ) {
                div.textContent = key === ' ' ? blank : key;
                next.focus();
            } else if (event.key === "Backspace") {
                prev.textContent = prev.textContent === '' ? '' : blank;
                prev.focus();
            } else if (event.key === "Delete") {
                div.textContent = blank;
            }
        }
        if (event.key === "ArrowUp") {
            letterDivRows[mod(div.row - 1, numRows)][div.column].focus();
        } else if (event.key === "ArrowDown") {
            letterDivRows[mod(div.row + 1, numRows)][div.column].focus();
        } else if (event.key === "ArrowLeft") {
            letterDivRows[div.row][mod(div.column - 1, numColumns)].focus();
        } else if (event.key === "ArrowRight") {
            letterDivRows[div.row][mod(div.column + 1, numColumns)].focus();
        }

    });
    const initButtonText = "Make a puzzle and click here when done."
    const button = document.getElementById('button') as HTMLButtonElement;

    const oopsButton = document.getElementById('oopsButton') as HTMLButtonElement;
    function oopsMode() {
        return !!currentPuzzle && oopsButton.classList.contains('invisible');
    }

    button.textContent = initButtonText;
    button.addEventListener('click', () => {
        message.textContent = "";
        letters.forEach(l => { guessedLetterDivs[l].classList.remove('currentGuess') });
        const initialOopsMode = oopsMode();

        if (!currentPuzzle) {
            // turn letters into placeholders and blanks into spaces
            const puzzleString = letterDivRows.map(r => r.map(e => (e.textContent || '').charAt(0)).map(
                c => c === '' ? ' ' : c.match(/[a-z]/i) ? placeHolder : c).join('')).join(' ');
            currentPuzzle = new Puzzle(puzzleString);
            letters.forEach(l => guessedLetterDivs[l].classList.remove('badGuess', 'goodGuess'));
            letterDivs.forEach(d => d.textContent = (!d.textContent) ? '' : (d.textContent === ' ') ? '' : d.textContent.match(/[a-z]/i) ? ' ' : d.textContent);
        } else if (initialOopsMode) {
            const puzzleString = letterDivRows.map(r => r.map(e => (e.textContent || '').charAt(0)).map(
                c => c === '' ? ' ' : c === ' ' ? placeHolder : c).join('')).join(' ');
            const guessedLetters = currentPuzzle.guessedLetters;
            currentPuzzle = new Puzzle(puzzleString, guessedLetters);
            letters.forEach(l => guessedLetterDivs[l].classList.remove('badGuess', 'goodGuess'));
            letters.filter(l => guessedLetters[l]).forEach(l => guessedLetterDivs[l].classList.add(puzzleString.includes(l) ? 'goodGuess' : 'badGuess'));
        }

        if (!initialOopsMode) {
            if (bestLetterGuess) {
                const puzzleString = letterDivRows.map(r => r.map(e => (e.textContent || '').charAt(0)).map(
                    c => c === '' ? ' ' : c === ' ' ? placeHolder : c).join('')).join(' ');
                const numberOfGuesses = puzzleString.split("").filter(x => x === bestLetterGuess).length;

                if (numberOfGuesses === 0) {
                    message.textContent += 'Darn, there is no "' + bestLetterGuess + '" in the puzzle.  \n'
                    guessedLetterDivs[bestLetterGuess].classList.add('badGuess');
                } else {
                    guessedLetterDivs[bestLetterGuess].classList.add('goodGuess');
                }
                currentPuzzle.update(bestLetterGuess, puzzleString);
            }

            bestLetterGuess = currentPuzzle.bestLetterGuess();
        }

        if (bestLetterGuess) {
            guessedLetterDivs[bestLetterGuess].classList.add('currentGuess');
            button.textContent = "I guess \"" + bestLetterGuess + "\". Click here when done";
            oopsButton.classList.remove("invisible");
        } else {
            button.textContent = "Done!  " + initButtonText;
            currentPuzzle = undefined;
            oopsButton.classList.add("invisible");
        }

        if (currentPuzzle) {
            message.textContent += 'I think it\'s "' + currentPuzzle.bestSolution().trim().replace(/\s+/g, ' ') + '".';
        }

    })

    oopsButton.addEventListener("click", () => {
        oopsButton.classList.add("invisible");
        button.textContent = "Fix the puzzle and click here when done";

    })


}


window.addEventListener("load", initializePage);
