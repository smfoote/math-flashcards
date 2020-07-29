<script>
  import FlashCard from './FlashCard.svelte';
  import IncorrectGuess from './IncorrectGuess.svelte';

  let incorrectGuess;
  const showIncorrectGuess = ({ detail: { guess } }) => {
    incorrectGuess = guess;
    setTimeout(() => {
      incorrectGuess = null;
    }, 3000);
  };
</script>

<style>
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<main>
  <h1>Math Flash!</h1>

  <FlashCard on:incorrectGuess={showIncorrectGuess} />

  {#if incorrectGuess}
    <IncorrectGuess guess={incorrectGuess} />
  {/if}
</main>
