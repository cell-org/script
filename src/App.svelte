<script>
  import Cell from './Cell.svelte';
</script>
<main>
  <Cell/>
</main>
<style>
	main {
    background: rgba(57, 67, 183, 0.05);
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
