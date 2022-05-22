<script>
import { createEventDispatcher } from 'svelte';
import { Token } from './store.js';
export let payload = {};
export let what;
export let where;
export let who;
export let index;
export let type;
export let resettable;
const dispatch = createEventDispatcher();

let annotation_what;
let annotation_who;
let annotation_where;
$: if (type === "royalty") {
  let w = (payload.what ? parseInt(payload.what) : 0)
  annotation_what = `${100 * w / 10 ** 6} %`
  annotation_where = "royalty receiver address"
} else if (type === "payments") {
  let w = (payload.what ? parseInt(payload.what) : 0)
  annotation_what = `${100 * w / 10 ** 6} %`
  annotation_where = "mint revenue split receiver address"
} else if (type === "owns") {
  annotation_what = `ERC721 tokenId`
  annotation_where = "ERC721 contract address (leave empty if same contract)"
  annotation_who = 'enter "sender" or "receiver"'
} else if (type === "burned") {
  annotation_what = `ERC721 tokenId`
  annotation_where = "ERC721 contract address (leave empty if same contract)"
  annotation_who = 'enter "sender" or "receiver"'
} else if (type === "balance") {
  annotation_what = `minimum ERC721/ERC20 balance`
  annotation_where = "ERC721/ERC20 contract address (leave empty if same contract)"
  annotation_who = 'enter "sender" or "receiver"'
}

const refresh = () => {
  console.log("refresh")
  dispatch('refresh')
}
const remove = () => {
  $Token[type] = $Token[type].filter((x, i) => {
    return i !== index;
  })
}
const reset = () => {
  delete $Token[type]
  $Token = $Token
}
</script>
<div class='component'>
<div class='header'>
{#if resettable}
<button on:click={reset}>X</button>
{/if}
{#if typeof index !== 'undefined'}
<button on:click={remove}>X</button>
{/if}
</div>
{#if payload.who}
<div class='row'>
  <div class='col'>who</div>
  <div class='flexible'>
    <input placeholder={who} type="text" bind:value={payload.who} on:change={refresh}>
    {#if annotation_who}
    <div class='annotation'>{annotation_who}</div>
    {/if}
  </div>
</div>
{/if}
<div class='row'>
  <div class='col'>what</div>
  <div class='flexible'>
    <input placeholder={what} type="text" bind:value={payload.what} on:change={refresh}>
    {#if annotation_what}
    <div class='annotation'>{annotation_what}</div>
    {/if}
  </div>
</div>
<div class='row'>
  <div class='col'>where</div>
  <div class='flexible'>
    <input placeholder={where} type="text" bind:value={payload.where} on:change={refresh}>
    {#if annotation_where}
    <div class='annotation'>{annotation_where}</div>
    {/if}
  </div>
</div>
</div>
<style>
.component {
  padding: 10px;
  background: rgba(0,0,0,0.1);
  box-sizing: border-box;
  margin-top: 10px;
}
.row {
  display:flex;
  margin-bottom: 5px;
}
.col {
  width: 100px;
  text-align: right;
  padding: 10px;
  box-sizing: border-box;
}
.annotation {
  font-size: 12px;
  text-align: left;
  padding: 5px;
}
.flexible {
  flex-grow: 1;
}
.flexible > * {
  width: 100%;
  box-sizing: border-box;
}
input[type=text] {
  padding: 10px;
  color: white;
  outline: none;
  border: none;
  background: rgba(255,255,255,0.1);
}
.header {
  text-align: right;
}
button {
  font-weight: bold;
  padding: 5px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}
</style>
