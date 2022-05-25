<script>
import Relation from './Relation.svelte';
import List from './List.svelte';
import Meta from './Meta.svelte';
import { onMount } from 'svelte';
import { error, puzzle, receiver, gas, token, Token } from './store.js';
let tokenStr = ""
let rate = 0
let price = 0
$: tokenStr = JSON.stringify($token, null, 2)
$: ethCost = Math.floor(($gas * rate / Math.pow(10, 10)) * 10**6)/10**6
$: ethCostStr = "Ξ" + ethCost
$: usdCost = "$" + Math.floor(ethCost * price * 10 ** 4)/10**4
$: valueInEth = $Token.value ? `${parseInt($Token.value) / 10 ** 18} ETH` : ""
$: startInDate = $Token.start ? new Date(parseInt($Token.start) * 1000).toString() : ""
$: endInDate = $Token.end ? new Date(parseInt($Token.end) * 1000).toString() : ""
const getrate = async () => {
  let r = await fetch('https://ethgasstation.info/api/ethgasAPI.json').then((res) => {
    return res.json()
  })
  return {
    fast: r.fast,
    fastest: r.fastest,
    slow: r.safeLow,
    average: r.average
  }
}
const getprice = async () => {
  let r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum').then((res) => {
    return res.json()
  })
  return r[0].current_price
}
$: getrate().then((r) => { return r.average }).then((x) => { rate = x })
$: getprice().then((x) => { price = x })
const setRoyalty = () => {
  $Token.royalty = {
    what: "20000",
    where: "0x502b2FE7Cc3488fcfF2E16158615AF87b4Ab5C41"
  }
}
const addRelation = (type) => {
  console.log(type)
  if (type === "payments") {
    $Token.payments = $Token.payments.concat({ what: "", where: "" })
  } else if (type === "owns") {
    $Token.owns = $Token.owns.concat({ who: "sender", what: "", where: "" })
  } else if (type === "burned") {
    $Token.burned = $Token.burned.concat({ who: "sender", what: "", where: "" })
  } else if (type === "balance") {
    $Token.balance = $Token.balance.concat({ who: "sender", what: "", where: "" })
  }
}
const handleMessage = () => {
  $Token = $Token
}
const mint = async () => {
  const c0 = new window.C0()
  const web3 = new Web3(window.ethereum);
  await c0.init({ web3: web3 })
  try {
    await c0.token.send([$token], [{ receiver: $receiver, puzzle: $puzzle }])
  } catch (e) {
//    $error = e.message
  }
}
</script>
<nav>
<header>{$error}</header>
<table>
  <tr>
    <td><a href="."><img alt="" src="cell.png" class='beat logo'></a></td>
    <td class='large'>{$gas}</td>
    <td class='large'>{rate}</td>
    <td class='large'>${price}</td>
    <td class='large'>{ethCostStr}</td>
    <td class='large'>{usdCost}</td>
  </tr>
  <tr>
    <td>cell script</td>
    <td>gas usage</td>
    <td>gas rate</td>
    <td>eth price</td>
    <td>mint cost (ETH)</td>
    <td>mint cost (USD)</td>
  </tr>
</table>
</nav>
<div class='container'>
<div class='side'>
  <div class='row'>
    <div class='col'>domain</div>
    <textarea placeholder="enter your contract domain" class='flexible' bind:value={$Token.domain}></textarea>
  </div>
  <div class='row'>
    <div class='col'>cid</div>
    <input placeholder="metadata IPFS cid" class='flexible' type="text" bind:value={$Token.cid}>
  </div>
  <div class='row'>
    <div class='col'>sender</div>
    <input placeholder="single authorized sender address" class='flexible' type="text" bind:value={$Token.sender}>
  </div>
  <div class='row'>
    <div class='col'>receiver</div>
    <input placeholder="single authorized receiver address" class='flexible' type="text" bind:value={$Token.receiver}>
  </div>
  <div class='row'>
    <div class='col'>value</div>
    <div class='flexible'>
      <input placeholder="amount of wei required for minting" type="number" bind:value={$Token.value}>
      <div class='annotation'>{valueInEth}</div>
    </div>
  </div>
  <div class='row'>
    <div class='col'>start</div>
    <div class='flexible'>
      <input placeholder="mint start time in Unix timestamp (in seconds)" type="text" bind:value={$Token.start}>
      <div class='annotation'>{startInDate}</div>
    </div>
  </div>
  <div class='row'>
    <div class='col'>end</div>
    <div class='flexible'>
      <input placeholder="mint end time in Unix timestamp (in seconds)" type="text" bind:value={$Token.end}>
      <div class='annotation'>{endInDate}</div>
    </div>
  </div>
  <div class='row'>
    <div class='col'>hash puzzle</div>
    <input placeholder="enter the desired solution to create a hash from" class='flexible' type="text" bind:value={$Token.puzzle}>
  </div>
  <div class='row'>
    <div class='col'>Senders Invite List</div>
    <div class='senders flexible'>
      <svelte:component type="senders" this={List} on:refresh={handleMessage} />
    </div>
  </div>
  <div class='row'>
    <div class='col'>Receivers Invite List</div>
    <div class='receivers flexible'>
      <svelte:component type="receivers" this={List} on:refresh={handleMessage} />
    </div>
  </div>
  <div class='row'>
    <div class='col'>
      EIP-2981 Royalty
    </div>
    <div class='flexible'>
      <button on:click={ () => setRoyalty() } class='block'>Set royalty</button>
      {#if $Token.royalty}
      <svelte:component resettable=true type="royalty" this={Relation} payload={$Token.royalty} what="royalty portion (number between 1 and 1,000,000)" where="royalty receiver address" on:refresh={handleMessage}/>
      {/if}
    </div>
  </div>
  <div class='row'>
    <div class='col'>
      Payments split
    </div>
    <div class='flexible'>
      <button on:click={ () => addRelation("payments") } class='block'>+ add</button>
      {#each $Token.payments as payment, i}
        <svelte:component type="payments" this={Relation} index={i} payload={payment} what="split portion (number between 1 and 1,000,000)" where="mint revenue split receiver address" on:refresh={handleMessage}/>
      {/each}
    </div>
  </div>
  <div class='row'>
    <div class='col'>
      Ownership condition
    </div>
    <div class='flexible'>
      <button class='block' on:click={ () => addRelation("owns") }>+ add</button>
      {#each $Token.owns as own, i}
        <svelte:component type="owns" this={Relation} index={i} payload={own} what="The NFT tokenId" who="'sender' or 'receiver'" where="NFT contract address (leave empty if same collection)"  on:refresh={handleMessage}/>
      {/each}
    </div>
  </div>
  <div class='row'>
    <div class='col'>
      Burnership condition
    </div>
    <div class='flexible'>
      <button on:click={ () => addRelation("burned") } class='block'>+ sdd</button>
      {#each $Token.burned as burn, i}
        <svelte:component type="burned" this={Relation} index={i} payload={burn} what="The burned NFT tokenId" who="'sender' or 'receiver'" where="NFT contract address (leave empty if same collection)"  on:refresh={handleMessage}/>
      {/each}
    </div>
  </div>
  <div class='row'>
    <div class='col'>
      Balance condition
    </div>
    <div class='flexible'>
      <button on:click={ () => addRelation("balance") } class='block'>+ add</button>
      {#each $Token.balance as b, i}
        <svelte:component type="balance" this={Relation} index={i} payload={b} what="The minimum balance required" who="'sender' or 'receiver'" where="The target NFT or ERC20 contract address" on:refresh={handleMessage}/>
      {/each}
    </div>
  </div>
</div>
<div class='side'>
<Meta />
<div class='toolbar'>
  {#if $Token.puzzle}
  <input type='text' bind:value={$puzzle} placeholder="enter the hash puzzle solution">
  {/if}
  <input type='text' bind:value={$receiver} placeholder="mint receiver address">
  <button on:click={mint}>Mint</button>
</div>
<pre>{tokenStr}</pre>
</div>
</div>
<style>
@keyframes beat {
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.1);
  }
  40% {
    transform: scale(1);
  }
  60% {
    transform: scale(1.1);
  }
  80% {
    transform: scale(1);
  }
  990% {
    transform: scale(1.1);
  }
}
.beat {
  animation: beat 3s infinite linear;
}
nav {
  padding: 0;
  position: sticky;
  top: 0;
  background: #1B1B21;
  box-shadow: rgba(255,255,255,0.05) 0px 2px 6px;
}
.annotation {
  font-size: 12px;
  text-align: left;
  padding: 5px;
}
.logo {
  width: 50px;
}
pre {
  white-space: pre-wrap;
  white-space: -moz-pre-wrap;
  word-wrap: break-word;
  background: rgba(0,0,0,0.2);
  text-align: left;
  color: rgba(255,255,255,0.8);
  padding: 20px;
  box-sizing: border-box;
  margin: 0;
  font-family: Menlo, monaco, monospace;
  font-size: 12px;
  line-height: 20px;
}
.toolbar {
  text-align: left;
  padding: 10px;
  background: rgba(0,0,0,0.3);
  margin-top: 10px;
}
button {
  padding: 5px;
  cursor: pointer;
}
.row {
  display:flex;
  padding: 10px;
}
.col {
  text-transform: uppercase;
  width: 100px;
  text-align: right;
  padding: 10px;
  box-sizing: border-box;
  align-items: flex-start;
  font-size: 12px;
  font-weight: bold;
  color: rgba(255,255,255,0.8);
}
.flexible {
  flex-grow: 1;
}
.flexible > * {
  width: 100%;
  box-sizing: border-box;
}
table {
  padding: 20px 0;
  width: 100%;
}
td.large {
  font-family: "Source Sans Pro";
  font-size: 50px;
  color: gold;
  padding: 0;
}
td {
  padding: 5px;
  font-size: 15px;
  text-transform: uppercase;
  font-weight: bold;
  width: 16.67%;
}
.container {
  display: flex;
  font-size: 14px;
  padding-top: 20px;
}
.side {
  width: 50%;
  box-sizing: border-box;
}
input[type=text], input[type=number] {
  padding: 10px;
  color: white;
  outline: none;
  border: none;
  background: rgba(255,255,255,0.1);
}
.block {
  display: block;
  width: 100%;
}
header {
  font-size: 12px;
  padding: 10px;
  background: gold;
  color: black; 
  font-weight: bold;
}
header:empty{
  padding: 0;
}
textarea {
  box-sizing: border-box;
  margin: 0;
  padding: 10px;
  color: white;
  outline: none;
  border: none;
  background: rgba(255,255,255,0.1);
  height: 100px;
}
</style>
