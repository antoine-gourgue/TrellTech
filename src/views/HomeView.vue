<template>
  <div class="flex">
    <Sidebar @board-selected="handleBoardSelected" />
      <BoardView :selectedBoardId="selectedBoardId" class="w-full h-full" />
    </div>
</template>

<script lang="ts">
import Sidebar from "@/components/Sidebar.vue";
import TrelloOAuth from '../services/Oauth';
import BoardView from './BoardView.vue';



export default {
  components: {
    Sidebar,
    BoardView
  },
  data() {
    return {
      selectedBoardId: null
    };
  },
  methods: {
    handleBoardSelected(boardId) {
      this.selectedBoardId = boardId;
    }
  }
};

function handleAuthRedirect() {
  const trelloAuth = new TrelloOAuth('http://127.0.0.1:5173/auth/trello/callback');

  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  console.log('urlParams:', urlParams)
  const token = urlParams.get('token');
  console.log('token:', token);

  if (token) {
    localStorage.setItem('token', token);
    console.log('Appel fetchUserInfo avec le token:', token);
    trelloAuth.fetchUserInfo(token).then(() => {
      console.log('User info stored in local storage');
    }).catch(error => {
      console.error('Failed to fetch or store user info:', error);
    });
  }
}

function removeTokenFromUrl() {
  console.log('URL before:', window.location.href)

  const url = new URL(window.location.href);
  const hash = url.hash.substring(1);
  const params = new URLSearchParams(hash);


  params.delete('token');

  const newUrl = `${url.pathname}${url.search}${params.toString() ? '#' + params.toString() : ''}`;
  history.pushState(null, '', newUrl);
  console.log('URL updated:', newUrl)
}

handleAuthRedirect();
removeTokenFromUrl();

</script>
