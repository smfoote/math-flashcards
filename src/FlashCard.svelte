<script>
  import Test from './Test.svelte';
  import TestTypeSelector from './TestTypeSelector.svelte';

  let cl = '';

  let operator = null;

  const typeSelected = (op) => {
    operator = op;
  };

  const answerReceived = ({ detail: { wasLastCorrect } }) => {
    const answerClass = wasLastCorrect ? 'correct-answer' : 'wrong-answer';
    cl = answerClass;
    setTimeout(() => {
      cl = '';
    }, 900);
  };
</script>

<style>
  section {
    border: 3px solid rgba(0, 0, 0, 0.5);
    background-color: #fff;
    border-radius: 8px;
    width: 400px;
    height: 500px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    transition: all 400ms ease-in-out;
  }

  section.correct-answer {
    border-color: #03d400;
    background-color: rgba(3, 212, 0, 0.25);
  }
  section.wrong-answer {
    border-color: #e40000;
    background-color: rgba(255, 0, 0, 0.25);
  }
</style>

<section class={cl}>
  {#if operator}
    <Test {operator} on:answer={answerReceived} on:incorrectGuess />
  {:else}
    <TestTypeSelector on:click={() => typeSelected('add')}>
      Addition
    </TestTypeSelector>
    <TestTypeSelector on:click={() => typeSelected('subtract')}>
      Subtraction
    </TestTypeSelector>
    <TestTypeSelector on:click={() => typeSelected('multiply')}>
      Multiplication
    </TestTypeSelector>
    <TestTypeSelector on:click={() => typeSelected('divide')}>
      Division
    </TestTypeSelector>
  {/if}
</section>
