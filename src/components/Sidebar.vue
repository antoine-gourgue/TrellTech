<template>
  <div class="flex bg-gray-100 text-gray-900">
    <aside class="flex h-screen w-20 flex-col items-center border-r border-gray-200 bg-white">
      <div class="flex h-[4.5rem] w-full items-center justify-center border-b border-gray-200 p-2">
        <h1 class="text-2xl font-fredoka text-indigo-600">T.T
        </h1>
      </div>
      <button @click="createWorkspace" class="flex mt-4 h-10 w-10 items-center justify-center group relative rounded-xl bg-gray-100 p-2 text-blue-600 hover:bg-gray-50">
        <svg class="h-6 w-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>

        <div class="absolute inset-y-0 left-12 hidden items-center group-hover:flex">
          <div class="relative whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 drop-shadow-lg">
            <div class="absolute inset-0 -left-1 flex items-center">
              <div class="h-2 w-2 rotate-45 bg-white"></div>
            </div>
            Créer un Workspace
          </div>
        </div>
      </button>

      <button @click="deleteWorkspace" class="flex mt-4 h-10 w-10 items-center justify-center group relative rounded-xl bg-gray-100 p-2 text-red-600 hover:bg-gray-50">
        <i class="fa-regular fa-trash-can"></i>
        <div class="absolute inset-y-0 left-12 hidden items-center group-hover:flex">
          <div class="relative whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 drop-shadow-lg">
            <div class="absolute inset-0 -left-1 flex items-center">
              <div class="h-2 w-2 rotate-45 bg-white"></div>
            </div>
            Supprimer un Workspace
          </div>
        </div>
      </button>
      <nav class="flex flex-1 flex-col gap-y-4 pt-10  nav-scrollbar">
        <div v-for="workspace in workspaces" :key="workspace.id" class="mb-6">
          <button @click="toggleDropdown(workspace.id)" class="flex h-10 w-10 items-center justify-center group relative rounded-xl bg-gray-100 p-2 text-blue-600 hover:bg-gray-50">
            {{ workspace.name.charAt(0).toUpperCase() }}
            <span class="float-right">
                <svg v-if="isDropdownVisible(workspace.id)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </span>
            <div class="absolute inset-y-0 left-12 hidden items-center group-hover:flex">
              <div class="relative whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 drop-shadow-lg">
                <div class="absolute inset-0 -left-1 flex items-center">
                  <div class="h-2 w-2 rotate-45 bg-white"></div>
                </div>
                {{ workspace.displayName }}
              </div>
            </div>
          </button>
          <button @click="CreateBoard(workspace.id)" class="group relative rounded-xl bg-gray-100 p-2 mt-2 text-blue-600 hover:bg-gray-50">
            <svg class="h-6 w-6 stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 9V15M9 12H15H9Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

            <div class=" absolute inset-y-0 left-12 hidden items-center group-hover:flex">
              <div class="relative whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 drop-shadow-lg">
                <div class="absolute inset-0 -left-1 flex items-center">
                  <div class="h-2 w-2 rotate-45 bg-white"></div>
                </div>
                Create Board
              </div>
            </div>
          </button>
          <ul v-if="isDropdownVisible(workspace.id)"
              :class="{'w-40': isDropdownVisible(workspace.id)}"
              class="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <li v-for="board in workspace.boards" :key="board.id" @click="selectBoard(board.id)" class="relative group px-4 py-2 hover:bg-gray-100 cursor-pointer">
              {{ board.name.charAt(0).toUpperCase() }}
              <div class="absolute inset-y-0 left-12 hidden items-center group-hover:flex">
                <div class="relative whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 drop-shadow-lg">
                  <div class="absolute inset-0 -left-1 flex items-center">
                    <div class="h-2 w-2 rotate-45 bg-white"></div>
                  </div>
                  {{ board.name }}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </nav>

      <div class="flex flex-col items-center gap-y-4 py-2">
        <button class="group relative rounded-xl p-2 text-gray-600 hover:text-indigo-600" @click="onLogout">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>

      <div class="flex flex-col items-center gap-y-4 pb-6">
        <button class="mt-2 rounded-full bg-gray-100">
          <img class="h-10 w-10 rounded-full"
               src="https://avatars.githubusercontent.com/u/35387401?v=4" alt=""/>
        </button>
      </div>
    </aside>
  </div>
</template>

<script>
import Swal from "sweetalert2";
import axios from "axios";

export default {
  data() {
    return {
      boards: [],
      showDropdown: false,
      workspaces: [],
      dropdownStates: {}

    };
  },
  mounted() {
    this.fetchBoards();
    this.fetchWorkspacesAndBoards();
  },
  methods: {
    async deleteWorkspace() {


      // Transformer la liste des workspaces pour SweetAlert
      const options = this.workspaces.reduce((acc, workspace) => {
        acc[workspace.id] = workspace.displayName;
        return acc;
      }, {});

      // Demander à l'utilisateur de choisir un workspace à supprimer
      const { value: workspaceIdToDelete } = await Swal.fire({
        title: 'Sélectionnez le workspace à supprimer',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Sélectionnez un workspace',
        showCancelButton: true,
        inputValidator: (value) => {
          return new Promise((resolve) => {
            if (value) {
              resolve();
            } else {
              resolve('Vous devez sélectionner un workspace à supprimer');
            }
          });
        }
      });

      if (workspaceIdToDelete) {
        const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
        const API_TOKEN = localStorage.getItem("token");
        const apiUrl = `https://api.trello.com/1/organizations/${workspaceIdToDelete}?key=${API_KEY}&token=${API_TOKEN}`;

        try {
          const response = await fetch(apiUrl, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Échec de la suppression du workspace');
          }

          // Suppression réussie, mettre à jour l'état local
          this.workspaces = this.workspaces.filter(workspace => workspace.id !== workspaceIdToDelete);

          Swal.fire('Supprimé!', 'Le workspace a été supprimé.', 'success');
        } catch (error) {
          console.error('Erreur lors de la suppression du workspace:', error);
          Swal.fire('Erreur', 'Une erreur est survenue lors de la suppression du workspace.', 'error');
        }
      }
    },
    async fetchWorkspacesAndBoards() {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");
      try {
        // Récupération des workspaces
        const workspacesResponse = await fetch(`https://api.trello.com/1/members/me/organizations?key=${API_KEY}&token=${API_TOKEN}`);
        if (!workspacesResponse.ok) throw new Error('Failed to fetch workspaces');
        const workspacesData = await workspacesResponse.json();

        // Pour chaque workspace, récupérer ses boards
        for (const workspace of workspacesData) {
          const boardsResponse = await fetch(`https://api.trello.com/1/organizations/${workspace.id}/boards?key=${API_KEY}&token=${API_TOKEN}`);
          if (!boardsResponse.ok) throw new Error('Failed to fetch boards for workspace: ' + workspace.name);
          const boardsData = await boardsResponse.json();
          workspace.boards = boardsData;
        }

        this.workspaces = workspacesData;
      } catch (error) {
        console.error(error);
        Swal.fire('Erreur', error.toString(), 'error');
      }
    },
    toggleDropdown(workspaceId) {
      // Assurez-vous que dropdownStates est initialisé pour ce workspaceId
      if (this.dropdownStates[workspaceId] === undefined) {
        // Vue 3 devrait rendre cette assignation réactive automatiquement.
        this.dropdownStates[workspaceId] = false;
      }
      // Inverse l'état visible/cache du dropdown
      this.dropdownStates[workspaceId] = !this.dropdownStates[workspaceId];
    },
    isDropdownVisible(workspaceId) {
      return !!this.dropdownStates[workspaceId];
    },
    fetchBoards() {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");
      fetch(`https://api.trello.com/1/members/me/boards?key=${API_KEY}&token=${API_TOKEN}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
          .then(response => {
            if (!response.ok) {
              throw new Error(`La requête a échoué: ${response.status} - ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            this.boards = data;
          })
          .catch(err => {
            console.error(err);
          });
    },
    onLogout() {
      localStorage.removeItem('token');
      localStorage.removeItem('trello_user_info');
      window.location.href = '/';
    },
    selectBoard(boardId) {
      this.$emit('board-selected', boardId);
    },
    async createWorkspace() {
      const { value: workspaceName } = await Swal.fire({
        title: 'Entrez le nom du nouveau workspace',
        input: 'text',
        inputPlaceholder: 'Nom du workspace',
        showCancelButton: true,
        confirmButtonText: 'Créer',
        cancelButtonText: 'Annuler',
        inputValidator: (value) => {
          if (!value) {
            return 'Vous devez entrer un nom pour le workspace.';
          }
        }
      });

      if (workspaceName) {
        // Construire l'URL de l'API
        const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
        const API_TOKEN = localStorage.getItem("token");
        const apiUrl = `https://api.trello.com/1/organizations?displayName=${encodeURIComponent(workspaceName)}&key=${API_KEY}&token=${API_TOKEN}`;

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
            }
          });

          if (!response.ok) {
            throw new Error('Réponse de l\'API Trello non OK');
          }

          const data = await response.json();

          // Supposons que vous ayez une méthode pour rafraîchir la liste des workspaces après la création
          await this.fetchWorkspacesAndBoards();

          Swal.fire({
            icon: 'success',
            title: 'Workspace créé',
            text: `Le workspace "${workspaceName}" a été créé avec succès.`,
          });
        } catch (error) {
          console.error('Erreur lors de la création du workspace:', error);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Une erreur est survenue lors de la création du workspace.',
          });
        }
      }
    },

    CreateBoard(workspaceId) {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");

      Swal.fire({
        title: 'Entrez le nom du nouveau tableau',
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Créer',
        showLoaderOnConfirm: true,
        preConfirm: (name) => {
          const data = {
            name: encodeURIComponent(name),
            idOrganization: workspaceId
          };

          return fetch(`https://api.trello.com/1/boards?key=${API_KEY}&token=${API_TOKEN}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
              })
              .then(newBoard => {
                // Ajouter le nouveau board à l'état local
                const workspaceIndex = this.workspaces.findIndex(ws => ws.id === workspaceId);
                if (workspaceIndex !== -1) {
                  this.workspaces[workspaceIndex].boards.push({
                    id: newBoard.id,
                    name: newBoard.name,
                    // Autres propriétés nécessaires du board
                  });
                }

                Swal.fire({
                  title: `Tableau '${name}' créé avec succès!`
                });
              })
              .catch(error => {
                Swal.showValidationMessage(`Échec de la création : ${error}`);
              });
        },
        allowOutsideClick: () => !Swal.isLoading()
      });
    }
  }
};
</script>

<style scoped>
.nav-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Masquer la barre de défilement sous Firefox */
.nav-scrollbar {
  scrollbar-width: none;
}

/* Masquer la barre de défilement sous IE et Edge */
.nav-scrollbar {
  -ms-overflow-style: none;
}
.w-40 {
  width: 40px;
}
</style>

