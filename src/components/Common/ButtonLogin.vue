<template>
  <div class="flex flex-col items-center gap-y-4 py-10">
    <button type="submit" class="flex w-[20vw] justify-center rounded-lg bg-[#007fc9] px-3 py-2.5 text-base font-semibold leading-6 items-center gap-3 text-white shadow-sm hover:bg-[#007ac0]">
      <i class="fa-brands fa-trello text-white"></i>
      Se connecter avec Trello
    </button>
  </div>
</template>

<script lang="ts">

import {defineComponent} from "vue";

export default defineComponent({
  name: 'ButtonLogin',
  setup() {
    return {
    };
  },
});
</script>
