<style>
  .test-type {
    border: none;
    background: none;
    font-size: 48px;
    cursor: pointer;
    margin: 0;
  }

  .test-type:not(:last-of-type) {
    border-bottom: 2px solid black;
  }
</style>

<button class="test-type" data-operator="add" id="addition-button" on:click>
  <slot />
</button>
