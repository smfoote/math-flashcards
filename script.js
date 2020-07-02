var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent =
  SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 5;

const flashcard = document.getElementById('flash-card');
const answerSlot = document.getElementById('answer');

let answer = null;
let correctAnswers = [];
let incorrectAnswers = [];
let operandA, operandB;
let operator = 'add';
const operations = {
  add(a, b) {
    return a + b;
  },
  subtract(a, b) {
    return a - b;
  },
  multiply(a, b) {
    return a * b;
  },
  divide(a, b) {
    operandA = a * b;
    operandB = b;
    return a;
  },
};
const showFlashCard = () => {
  operandA = Math.floor(Math.random() * 13);
  operandB = Math.floor(Math.random() * 13);
  if (operator === 'subtract' && operandB > operandA) {
    [operandA, operandB] = [operandB, operandA];
  }
  answer = operations[operator](operandA, operandB);
  answerSlot.innerHTML = '';
  flashcard.innerHTML = `
    <div class="operand operand--a">${operandA}</div>
    <div class="operand operand--b">${operandB}</div>
  `;
};

const recordAnswer = (wasLastCorrect, guess) => {
  const answerArray = wasLastCorrect ? correctAnswers : incorrectAnswers;
  const answerClass = wasLastCorrect ? 'correct-answer' : 'wrong-answer';
  flashcard.classList.add(answerClass);
  setTimeout(() => {
    flashcard.classList.remove(answerClass);
  }, 900);
  answerArray.push({ a: operandA, b: operandB, guess });
  console.log('CORRECT', correctAnswers);
  console.log('INCORRECT', incorrectAnswers);
};

const nextQuestion = () => {
  showFlashCard();
};

const showError = (guess) => {
  answerSlot.innerHTML = `${guess} is not the right answer`;
  setTimeout(() => {
    answerSlot.innerHTML = '';
  }, 3000);
};

flashcard.addEventListener('click', (evt) => {
  if (evt.target.classList.contains('test-type')) {
    operator = evt.target.dataset.operator;
    flashcard.classList.add(operator);
    flashcard.innerHTML = '<button id="start">Start!</button>';
  } else if (evt.target.id === 'start') {
    recognition.start();
    showFlashCard();
  }
});

recognition.onresult = function (event) {
  const speech = event.results[event.results.length - 1][0].transcript;
  let guess = speech;
  let isCorrect;
  if (guess === 'pass') {
    isCorrect = false;
  } else {
    guess = parseInt(guess, 10);
    isCorrect = guess === answer;
    // The top result might not be a number, so try a few more options
    if (isNaN(guess)) {
      console.log(Array.from(event.results[event.results.length - 1]));
      try {
        guess = parseInt(
          Array.from(event.results[event.results.length - 1]).find(
            (g) => !isNaN(parseInt(g.transcript, 10))
          ).transcript,
          10
        );
      } catch (err) {
        showError(event.results[event.results.length - 1][0].transcript);
      }
      isCorrect = guess === answer;
    }
  }
  if (isCorrect) {
    nextQuestion(isCorrect);
  } else {
    showError(isNaN(guess) ? speech : guess);
  }
  recordAnswer(isCorrect, guess);
};

recognition.onspeechend = () => {
  recognition.stop();
};
