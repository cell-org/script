<script>
import { metadata } from './store.js';
let meta;
$: {
  if ($metadata && Object.keys($metadata)) {
    meta = {
      name: ($metadata.name ? $metadata.name : ""),
      description: ($metadata.description ? $metadata.description : ""),
      image: $metadata.image.replace("ipfs://", "")
    }
  } else {
    meta = null
  }
}
</script>
{#if meta} 
<div class='card'>
  <img alt="" src="https://ipfs.io/ipfs/{meta.image}">
  <div class='col'>
    <h1>{meta.name}</h1>
    <div class='description'>{meta.description}</div>
  </div>
</div>
{/if}
<style>
.card {
  display: flex;
  padding: 20px;
  box-sizing: border-box;
}
.card img {
  max-width: 200px;
}
.col {
  flex-grow: 1;
  text-align: left;
  padding: 20px;
  box-sizing: border-box;
  align-items: flex-start;
}
h1 {
  margin: 0 0 10px;
}
</style>
