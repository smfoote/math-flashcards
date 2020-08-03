<script>
  import { createEventDispatcher } from 'svelte';
  import Problem from './Problem.svelte';
  export let operator = 'add';

  const dispatch = createEventDispatcher();

  // Set up speech recognition
  const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
  const SpeechRecognitionEvent =
    window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  const families = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'all'];
  let family;
  let operandA, operandB;
  let answer;

  let correctAnswers = [];
  let incorrectAnswers = [];

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
      return operandA === 0 && operandB === 0 ? 0 : a;
    },
  };

  const selectFamily = (fam) => {
    family = fam;
    recognition.start();
    setOperands();
  };

  const setOperands = () => {
    dispatch('incorrectGuess', { guess: null });
    const firstRandom =
      family === 'all' ? Math.floor(Math.random() * 13) : family;
    const secondRandom = Math.floor(Math.random() * 13);
    const swap = Math.random() > 0.5;
    operandA = swap ? secondRandom : firstRandom;
    operandB = swap ? firstRandom : secondRandom;
    if (operator === 'subtract' && operandB > operandA) {
      [operandA, operandB] = [operandB, operandA];
    }
    answer = operations[operator](operandA, operandB);
  };

  const recordAnswer = (wasLastCorrect, guess) => {
    dispatch('answer', { wasLastCorrect });
    const answer = { a: operandA, b: operandB, guess };
    if (wasLastCorrect) {
      correctAnswers = [...correctAnswers, answer];
    } else {
      incorrectAnswers = [...incorrectAnswers, answer];
    }
    console.log('CORRECT', correctAnswers);
    console.log('INCORRECT', incorrectAnswers);
  };

  const showError = (guess) => {
    dispatch('incorrectGuess', { guess });
  };

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
      setOperands();
    } else {
      showError(isNaN(guess) ? speech : guess);
    }
    recordAnswer(isCorrect, guess);
  };

  recognition.onspeechend = () => {
    recognition.stop();
  };
</script>

<style>
  .family-list {
    padding: 16px;
  }

  .family-option {
    border: 1px solid #000;
    background: none;
    width: 40px;
    height: 40px;
    margin: 12px;
    cursor: pointer;
  }
</style>

<div>
  {#if family}
    <Problem {operandA} {operandB} {operator} />
  {:else}
    <h3 class="start">Start with</h3>
    <div class="family-list">
      {#each families as familyOption}
        <button
          class="family-option"
          on:click={() => selectFamily(familyOption)}>
          {familyOption}
        </button>
      {/each}
    </div>
  {/if}
</div>
