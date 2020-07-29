<script>
  export let operator, operandA, operandB;
</script>

<style>
  .operand {
    text-align: right;
    font-size: 48px;
    width: 156px;
  }
  .operand--b::before {
    font-size: 64px;
    margin-right: 24px;
  }
  .operand--b {
    border-bottom: 4px solid black;
  }
  .add.operand--b::before {
    content: '+';
  }
  .subtract.operand--b::before {
    content: '-';
  }
  .multiply.operand--b::before {
    content: 'x';
  }
  .divide.operand--b::before {
    content: '÷';
  }
</style>

<div class="operand operand--a">{operandA}</div>
<div class="operand operand--b {operator}">{operandB}</div>
