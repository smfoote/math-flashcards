var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent =
  SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

var recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

var diagnostic = document.querySelector('.output');
const flashcard = document.getElementById('flash-card');

let answer = null;
let correctAnswers = [];
let incorrectAnswers = [];
let operandA, operandB;
const showFlashCard = () => {
  operandA = Math.floor(Math.random() * 13);
  operandB = Math.floor(Math.random() * 13);
  answer = operandA * operandB;
  flashcard.innerHTML = `
    <div class="operand operand--a">${operandA}</div>
    <div class="operand operand--b">${operandB}</div>
  `;
};

const nextQuestion = (wasLastCorrect) => {
  const answerArray = wasLastCorrect ? correctAnswers : incorrectAnswers;
  const answerClass = wasLastCorrect ? 'correct-answer' : 'wrong-answer';
  flashcard.classList.add(answerClass);
  setTimeout(() => {
    flashcard.classList.remove(answerClass);
  }, 900);
  answerArray.push(`${operandA} x ${operandB}`);
  showFlashCard();
};
const startButton = document.getElementById('start');
startButton.addEventListener('click', async () => {
  await recognition.start();
  showFlashCard();
});

recognition.onresult = function (event) {
  // The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
  // The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
  // It has a getter so it can be accessed like an array
  // The first [0] returns the SpeechRecognitionResult at the last position.
  // Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
  // These also have getters so they can be accessed like arrays.
  // The second [0] returns the SpeechRecognitionAlternative at position 0.
  // We then return the transcript property of the SpeechRecognitionAlternative object

  var guess = event.results[event.results.length - 1][0].transcript;
  let isCorrect;
  if (guess === 'pass') {
    isCorrect = false;
  } else {
    guess = parseInt(guess, 10);
    isCorrect = guess === answer;
  }
  console.log(`guess: ${guess} = ${answer} ${guess === answer}`);
  nextQuestion(isCorrect);
};

recognition.onspeechend = function () {
  recognition.stop();
};

recognition.onerror = function (event) {
  diagnostic.textContent = 'Error occurred in recognition: ' + event.error;
};
