import { derived, writable } from 'svelte/store';
let nuron = new Nuron({
  key: "m'/44'/60'/0'/0/0",
  workspace: "svelte",
  domain: {
    "address": "0xed30ea17c9a8b8b7fc4aea5b9f8f0f3af349bb0d",
    "chainId": 4,
    "name": "Payment"
  }
})
export let receiver = writable();
export let puzzle = writable();
export let error = writable("");
export let Token = writable({
  cid:"bafkreidztp557q7fvbq5t34uat5l3vztkcjzavatrohclmigh5o7qxyrq4",
  owns: [],
  burned: [],
  payments: [],
  balance: [],
  senders: [],
  receivers: []
})
export let metadata = derived(
  Token,
  ($Token, set) => {
    console.log("fetching")
    fetch(`https://ipfs.io/ipfs/${$Token.cid}`).then((res) => {
      return res.json()
    }).then((res) => {
      console.log("fetched", res)
      set(res)
    }).catch((e) => {
      console.log("ERROR", e.message)
      error.set("[IPFS] " + e.message)
    })
  }
)
export let token = derived(
  Token,
  ($Token, set) => {
    console.log("UPDATED", $Token)
    if ($Token && $Token.cid) {
      nuron.token.create($Token).then((t) => {
        set(t)
      }).catch((e) => {
        console.log("ERROR", e.message)
        error.set("[NURON] " + e.message)
      })
    } else {
      error.set("cid required")
    }
  }
)
export let gas = derived(
  [token, receiver, puzzle],
  ([$token, $receiver, $puzzle], set) => {
    if ($token && $token.body && $token.domain) {
      const c0 = new window.C0()
      const web3 = new Web3(window.ethereum);
      c0.init({ web3: web3 }).then(() => {
        c0.token.estimate([$token], [{ receiver: $receiver, puzzle: $puzzle }]).then((e) => {
          set(e)
          error.set("")
        }).catch((err) => {
          console.log(err)
          error.set(`[ERROR ${err.code}] ${err.message}`)
        })
      }).catch((e) => {
        error.set(e.message)
      })
    } else {
      set(0)
    }
  }
)
