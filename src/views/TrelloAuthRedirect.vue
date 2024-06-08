<!--
<template>
  <div>Authentification en cours... Veuillez patienter.</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
 import axios from 'axios';

export default defineComponent({
  name: 'TrelloAuthRedirect',
  setup() {
    const router = useRouter();

    const saveUserInfo = (accessToken: string) => {
      localStorage.setItem('userAccessToken', accessToken);

      const apiKey = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const apiUrl = `https://api.trello.com/1/members/me?key=${apiKey}&token=${accessToken}`;
      axios.get(apiUrl)
        .then(response => {
          // Par exemple, sauvegarder le nom d'utilisateur et l'email dans localStorage
          const userInfo = {           username: response.data.username,
            email: response.data.email
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
        })
        .catch(error => {
          console.error("Erreur lors de la récupération des informations de l'utilisateur:", error);

        });
    };

    const handleRedirect = () => {
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get("token");

      if (accessToken) {
        saveUserInfo(accessToken);
      } else {
        console.error("Token d'accès OAuth non trouvé dans l'URL.");
        router.push({ name: 'login', query: { error: 'AuthFailed' } });
      }
    };

    handleRedirect();

    return {};
  },
});
</script>
-->
