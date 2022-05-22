<script>
import { Token } from './store.js';
let listStr = "";
export let type;
const refresh = () => {
  $Token[type] = listStr.split("\n").map((x) => {
    return x.trim()
  }).filter((x) => {
    return x != ""
  })
}
</script>
<div class='component'>
  <textarea placeholder="line separated addresses" bind:value={listStr} on:change={refresh}></textarea>
</div>
<style>
.component {
  background: rgba(0,0,0,0.1);
  box-sizing: border-box;
  margin-bottom: 5px;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 10px;
  color: white;
  outline: none;
  border: none;
  background: rgba(255,255,255,0.1);
}
</style>
