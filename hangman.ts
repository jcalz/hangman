//import wordsByLengthWithFrequency from './wordsByLengthWithFrequency'
// from http://norvig.com/google-books-common-words.txt
// re=/([A-Z]+)\s*(\d+)/;ret=[[]];document.body.textContent.split('\n').map(s=>s.match(re)).filter(s=>s).map(s => ({word:s[1], freq:parseInt(s[2])})).forEach(r => (ret[r.word.length] = ret[r.word.length] || []).push(r));document.body.textContent=JSON.stringify(ret);


// import likelyNextWords from './likelyNextWords'
// from https://www.ngrams.info/coca/download/w2_.zip
// Davies, Mark. (2011) N-grams data from the Corpus of Contemporary American English (COCA). Downloaded from http://www.ngrams.info on September 30, 2018.
// likelyNextWords:
// ret={}; document.body.innerText.split('\n').map(s => s.split('\t').map(x => x.toUpperCase())).filter(([f, w1, w2]) => (f > 75) && !(w1+w2).match(/[^a-z']/i)).forEach(([f, w1, w2])=>(ret[w1] = ret[w1] || [], ret[w1].push(w2))); document.body.textContent=JSON.stringify(ret)
// lilelyPrevWords:
// ret={}; document.body.innerText.split('\n').map(s => s.split('\t').map(x => x.toUpperCase())).filter(([f, w1, w2]) => (f > 75) && !(w1+w2).match(/[^a-z']/i)).forEach(([f, w1, w2])=>(ret[w2] = ret[w2] || [], ret[w2].push(w1))); document.body.textContent=JSON.stringify(ret)


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

declare const wordsByLengthWithFrequency: WordAndFrequency[][];

declare const contractionsWithFrequency: WordAndFrequency[];

declare const likelyNextWords: { [k: string]: string[] | undefined };
declare const likelyPrevWords: { [k: string]: string[] | undefined };

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
    guessedLetters: Partial<Record<Letter, true>> = {};

    constructor(puzzleString: string) {
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

            if (wps.possibleSolutions.length === 0) {
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
                wps.possibleSolutions.push({ word: wps.puzzle, freq: 1 });

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


        this.wordsAndPossibleSolutions.
            //filter(wps => wps.puzzle.indexOf(placeHolder) >= 0).
            forEach((wps, wpsindex) => {

                const limit = 15;

                let freqSum = 0;
                // if we are not considering all possibilities, then lower the probability
                for (let i = 0; i < wps.possibleSolutions.length && i < limit * 2; i++) {
                    freqSum += wps.possibleSolutions[i].freq;
                }

                //console.log("For word #"+(w+1)+", "+wps.puzzle+": ");

                const probLetterNotInThisWord = initLetterMap(1);

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

                    //console.log("... "+soln.word+" with probability "+(prob*100).toFixed(0)+"%");
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
            div.style.gridRowStart = "" + r + 1;
            div.style.gridColumnStart = "" + c + 1;
            div.addEventListener('click', () => {
                div.focus();
                if (currentPuzzle && bestLetterGuess) {
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
    board.addEventListener("keydown", event => {

        const div = event.target;
        if (!div || !isLetterDiv(div))
            return;

        event.preventDefault();

        const i = div.index;
        const next = letterDivs[mod(i + 1, num)];
        const prev = letterDivs[mod(i - 1, num)];
        if (!currentPuzzle) {
            if (event.key.length === 1) {
                {
                    div.textContent = event.key === ' ' ? '' : event.key;
                    next.focus();
                }
            } else if (event.key === "Backspace") {
                prev.textContent = '';
                prev.focus();
            } else if (event.key === "Delete") {
                div.textContent = '';
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
    button.textContent = initButtonText;
    button.addEventListener('click', () => {
        message.textContent = "";

        if (!currentPuzzle) {
            // turn letters into placeholders and blanks into spaces
            const puzzleString = letterDivRows.map(r => r.map(e => (e.textContent || '').charAt(0)).map(
                c => c === '' ? ' ' : c.match(/[a-z]/i) ? placeHolder : c).join('')).join(' ');
            currentPuzzle = new Puzzle(puzzleString);
            letterDivs.forEach(d => d.textContent = (!d.textContent) ? '' : (d.textContent === ' ') ? '' : d.textContent.match(/[a-z]/i) ? ' ' : d.textContent);
        }

        let numberOfGuesses: number | undefined;
        if (bestLetterGuess) {
            const puzzleString = letterDivRows.map(r => r.map(e => (e.textContent || '').charAt(0)).map(
                c => c === '' ? ' ' : c === ' ' ? placeHolder : c).join('')).join(' ');
            numberOfGuesses = puzzleString.split("").filter(x => x === bestLetterGuess).length;
            if (numberOfGuesses === 0) {
                message.textContent += 'Darn, there is no "' + bestLetterGuess + '" in the puzzle.  \n'
            }
            currentPuzzle.update(bestLetterGuess, puzzleString);
        }


        bestLetterGuess = currentPuzzle.bestLetterGuess();
        message.textContent += 'I think it\'s "' + currentPuzzle.bestSolution().trim().replace(/\s+/g, ' ') + '".';

        if (bestLetterGuess) {
            button.textContent = "I guess \"" + bestLetterGuess + "\". Click here when done";
        } else {
            button.textContent = "Done!  " + initButtonText;
            currentPuzzle = undefined;
        }




    })


}


window.addEventListener("load", initializePage);


// letterDivRows.map(r => r.map(e => (e.textContent+' ').toUpperCase().charAt(0)).join("")).join(" ");
