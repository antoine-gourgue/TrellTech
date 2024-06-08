
<template>
  <div class="flex flex-col justify-center items-center min-h-screen bg-gray-100">
    <div class="border border-gray-300 rounded-lg p-4 sm:mx-auto sm:w-full sm:max-w-md bg-white shadow-lg">
      <h2 class="font-fredoka font-medium text-center text-black text-4xl pt-6">
        Trell Tech
      </h2>
      <ButtonLogin @click="loginWithTrello" class="mt-4" />
      <p class="mt-2 text-center text-sm text-gray-600">
        Vous n'avez pas de compte?
        <a class="font-medium text-indigo-600 hover:text-indigo-500">
          Créer un compte
        </a>
      </p>
    </div>
  </div>
</template>



<script lang="ts">
import {defineComponent, onMounted, onUnmounted} from 'vue';
import TrelloOAuth from '../services/Oauth';
import ButtonLogin from "@/components/Common/ButtonLogin.vue";
import {onBeforeRouteUpdate} from "vue-router";

export default defineComponent({
  name: 'TrelloLogin',
  setup() {
    const trelloAuth = new TrelloOAuth('http://127.0.0.1:5173/auth/trello/callback');

    function loginWithTrello() {
      const authUrl = trelloAuth.getAuthorizationUrl();
      window.location.href = authUrl;
    }

    onMounted(() => {
      window.addEventListener('hashchange', handleAuthRedirect);
      // Exécute immédiatement au cas où l'utilisateur arrive directement avec le token
      handleAuthRedirect();
    });

    onUnmounted(() => {
      window.removeEventListener('hashchange', handleAuthRedirect);
    });

    function handleAuthRedirect() {
      // Extrait le token de l'URL
      const urlParams = new URLSearchParams(window.location.hash.substring(1)); // Supprime le premier caractère (#)
      const token = urlParams.get('token');

      if (token) {
        // Enregistre le token dans le local storage
        localStorage.setItem('trello_token', token);

        // Appelle fetchUserInfo pour récupérer et stocker les informations de l'utilisateur
        console.log('Appel fetchUserInfo avec le token:', token);
        trelloAuth.fetchUserInfo(token).then(() => {

          console.log(localStorage.getItem('trello_token'));
          console.log('User info stored in local storage');
        }).catch(error => {
          console.error('Failed to fetch or store user info:', error);
        });
      }
    }

    return {
      loginWithTrello,
    };

  },
  components: {
    ButtonLogin,
  },

});


</script>

